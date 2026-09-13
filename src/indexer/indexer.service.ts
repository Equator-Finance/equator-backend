import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContractStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ForwardEvent, SorobanService } from '../soroban/soroban.service';
import { fixedPointToRate, tokenAmountToUsd } from '../soroban/scaling';

const INDEXER_CURSOR_ID = 'singleton';

// On a cold start (no persisted cursor), begin scanning this many ledgers
// behind the tip rather than the full event-retention window.
const COLD_START_LEDGER_LOOKBACK = 1000;

const EVENT_KIND_TO_STATUS: Record<ForwardEvent['kind'], ContractStatus> = {
  activated: ContractStatus.ACTIVE,
  settled: ContractStatus.SETTLED,
};

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);
  private isPolling = false;
  private warnedNotConfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly soroban: SorobanService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async pollSorobanEvents() {
    if (!this.soroban.isIndexingConfigured) {
      if (!this.warnedNotConfigured) {
        this.logger.warn('ESCROW_CONTRACT_ID is not set — on-chain indexing disabled.');
        this.warnedNotConfigured = true;
      }
      return;
    }

    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const startLedger = await this.getCursor();
      const { latestLedger, events } = await this.soroban.getForwardEvents(startLedger);

      for (const event of events) {
        await this.applyEvent(event);
      }

      await this.setCursor(latestLedger + 1);
      if (events.length > 0) {
        this.logger.log(`Indexed ${events.length} escrow event(s) up to ledger ${latestLedger}`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to poll Soroban escrow events',
        error instanceof Error ? error.stack : error,
      );
    } finally {
      this.isPolling = false;
    }
  }

  private async applyEvent(event: ForwardEvent) {
    const { forward } = event;
    const status = EVENT_KIND_TO_STATUS[event.kind];
    const settlementRate = forward.settlement_rate > 0n ? fixedPointToRate(forward.settlement_rate) : null;

    await this.prisma.onChainContract.upsert({
      where: { contractId: event.contractId },
      create: {
        contractId: event.contractId,
        lastEventId: event.id,
        currencyPair: forward.currency_pair,
        notionalUsd: tokenAmountToUsd(forward.notional_usd),
        strikeRate: fixedPointToRate(forward.strike_rate),
        settlementRate,
        maturityTimestamp: new Date(Number(forward.maturity_timestamp) * 1000),
        status,
        lastIndexedBlock: BigInt(event.ledger),
      },
      update: {
        lastEventId: event.id,
        status,
        settlementRate,
        lastIndexedBlock: BigInt(event.ledger),
      },
    });
  }

  private async getCursor(): Promise<number> {
    const cursor = await this.prisma.indexerCursor.findUnique({
      where: { id: INDEXER_CURSOR_ID },
    });
    if (cursor) return Number(cursor.lastLedger);

    const latest = await this.soroban.getLatestLedger();
    return Math.max(latest - COLD_START_LEDGER_LOOKBACK, 1);
  }

  private async setCursor(lastLedger: number): Promise<void> {
    await this.prisma.indexerCursor.upsert({
      where: { id: INDEXER_CURSOR_ID },
      create: { id: INDEXER_CURSOR_ID, lastLedger: BigInt(lastLedger) },
      update: { lastLedger: BigInt(lastLedger) },
    });
  }
}
