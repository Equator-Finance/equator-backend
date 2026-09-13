import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContractStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SorobanService } from '../soroban/soroban.service';
import { OracleService } from '../oracle/oracle.service';
import { rateToFixedPoint } from '../soroban/scaling';

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);
  private isRelaying = false;
  private warnedNotConfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly soroban: SorobanService,
    private readonly oracle: OracleService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkMaturingContracts() {
    if (!this.soroban.isSettlementConfigured || !this.oracle.isConfigured) {
      if (!this.warnedNotConfigured) {
        this.logger.warn(
          'ORACLE_SECRET_KEY/ESCROW_CONTRACT_ID or ORACLE_RATE_SOURCE_URL is not set — automatic settlement disabled.',
        );
        this.warnedNotConfigured = true;
      }
      return;
    }

    if (this.isRelaying) return;
    this.isRelaying = true;

    try {
      const maturedContracts = await this.prisma.onChainContract.findMany({
        where: { status: ContractStatus.ACTIVE, maturityTimestamp: { lte: new Date() } },
      });

      for (const contract of maturedContracts) {
        await this.settleContract(contract.contractId, contract.currencyPair);
      }
    } catch (error) {
      this.logger.error(
        'Failed to check for maturing contracts',
        error instanceof Error ? error.stack : error,
      );
    } finally {
      this.isRelaying = false;
    }
  }

  private async settleContract(contractId: bigint, currencyPair: string): Promise<void> {
    try {
      const spotRate = await this.oracle.getSpotRate(currencyPair);
      const settlementRateFixedPoint = rateToFixedPoint(spotRate);

      this.logger.log(
        `Settling forward #${contractId} (${currencyPair}) at spot rate ${spotRate}...`,
      );
      const txHash = await this.soroban.settleForward(contractId, settlementRateFixedPoint);

      // Mark SETTLED immediately so this contract isn't resubmitted on the next
      // tick; the Indexer's next poll reconciles lastEventId/lastIndexedBlock
      // once it observes the `settled` event this transaction emitted.
      await this.prisma.onChainContract.update({
        where: { contractId },
        data: { status: ContractStatus.SETTLED, settlementRate: spotRate },
      });

      this.logger.log(`Settled forward #${contractId} in tx ${txHash}`);
    } catch (error) {
      this.logger.error(
        `Failed to settle forward #${contractId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
