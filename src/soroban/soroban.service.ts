import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';

/** Mirrors `equator-contracts/contracts/escrow/src/types.rs::ForwardContract` as decoded by scValToNative. */
export interface ForwardContractOnChain {
  contract_id: bigint;
  importer: string;
  market_maker: string;
  usdc_token: string;
  oracle_address: string;
  currency_pair: string;
  notional_usd: bigint;
  strike_rate: bigint;
  settlement_rate: bigint;
  importer_margin: bigint;
  market_maker_margin: bigint;
  creation_timestamp: bigint;
  maturity_timestamp: bigint;
  payout_importer: bigint;
  payout_desk: bigint;
  status: [string];
  rehypothecation_enabled: boolean;
}

export interface ForwardEvent {
  id: string;
  ledger: number;
  kind: 'activated' | 'settled';
  contractId: bigint;
  forward: ForwardContractOnChain;
}

@Injectable()
export class SorobanService {
  private readonly logger = new Logger(SorobanService.name);
  private readonly server: SorobanRpc.Server;
  private readonly networkPassphrase: string;
  private readonly escrowContractId: string;
  private readonly oracleKeypair: Keypair | null;

  constructor(private readonly config: ConfigService) {
    const rpcUrl =
      this.config.get<string>('SOROBAN_RPC_URL') || 'https://soroban-testnet.stellar.org';
    this.server = new SorobanRpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith('http://') });
    this.networkPassphrase =
      this.config.get<string>('STELLAR_NETWORK_PASSPHRASE') ||
      'Test SDF Network ; September 2015';
    this.escrowContractId = this.config.get<string>('ESCROW_CONTRACT_ID') ?? '';

    const secret = this.config.get<string>('ORACLE_SECRET_KEY');
    this.oracleKeypair = secret ? Keypair.fromSecret(secret) : null;
  }

  get isIndexingConfigured(): boolean {
    return Boolean(this.escrowContractId);
  }

  get isSettlementConfigured(): boolean {
    return Boolean(this.escrowContractId && this.oracleKeypair);
  }

  async getLatestLedger(): Promise<number> {
    const { sequence } = await this.server.getLatestLedger();
    return sequence;
  }

  /** Fetches ForwardActivated/ForwardSettled events emitted by the escrow contract since `startLedger`. */
  async getForwardEvents(
    startLedger: number,
  ): Promise<{ latestLedger: number; events: ForwardEvent[] }> {
    const response = await this.server.getEvents({
      startLedger,
      filters: [{ type: 'contract', contractIds: [this.escrowContractId] }],
    });

    const events: ForwardEvent[] = [];
    for (const event of response.events) {
      const [kind, rawContractId] = event.topic.map((topic) => scValToNative(topic));
      if (kind !== 'activated' && kind !== 'settled') continue;

      events.push({
        id: event.id,
        ledger: event.ledger,
        kind,
        contractId: BigInt(rawContractId as bigint | number),
        forward: scValToNative(event.value) as ForwardContractOnChain,
      });
    }

    return { latestLedger: response.latestLedger, events };
  }

  /** Reads a forward's on-chain state via a free simulation (no signature or submission needed). */
  async getForward(contractId: bigint): Promise<ForwardContractOnChain | null> {
    if (!this.escrowContractId) return null;

    const simulationSource = this.oracleKeypair?.publicKey() ?? Keypair.random().publicKey();
    const account = new Account(simulationSource, '0');
    const contract = new Contract(this.escrowContractId);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call('get_forward', nativeToScVal(contractId, { type: 'u64' })))
      .setTimeout(30)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      this.logger.warn(`get_forward simulation failed for contract ${contractId}: ${sim.error}`);
      return null;
    }
    if (!SorobanRpc.Api.isSimulationSuccess(sim) || !sim.result?.retval) return null;

    return scValToNative(sim.result.retval) as ForwardContractOnChain;
  }

  /** Signs and submits `settle_forward` using the configured Oracle keypair. */
  async settleForward(contractId: bigint, settlementRateFixedPoint: bigint): Promise<string> {
    if (!this.oracleKeypair) {
      throw new Error('ORACLE_SECRET_KEY is not configured; cannot sign settle_forward.');
    }
    if (!this.escrowContractId) {
      throw new Error('ESCROW_CONTRACT_ID is not configured.');
    }

    const account = await this.server.getAccount(this.oracleKeypair.publicKey());
    const contract = new Contract(this.escrowContractId);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'settle_forward',
          nativeToScVal(contractId, { type: 'u64' }),
          nativeToScVal(settlementRateFixedPoint, { type: 'u128' }),
        ),
      )
      .setTimeout(60)
      .build();

    const prepared = await this.server.prepareTransaction(tx);
    prepared.sign(this.oracleKeypair);

    const sendResult = await this.server.sendTransaction(prepared);
    if (sendResult.status === 'ERROR') {
      throw new Error(`settle_forward submission was rejected for tx ${sendResult.hash}`);
    }

    const txHash = sendResult.hash;
    const deadline = Date.now() + 30_000;
    let response = await this.server.getTransaction(txHash);
    while (response.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for confirmation of settle_forward tx ${txHash}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      response = await this.server.getTransaction(txHash);
    }

    if (response.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`settle_forward transaction ${txHash} failed on-chain`);
    }

    return txHash;
  }
}
