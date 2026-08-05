import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  @Cron(CronExpression.EVERY_10_SECONDS)
  async pollSorobanEvents() {
    this.logger.debug('Polling Soroban RPC for new NDF Escrow events...');
    // Soroban RPC Event fetching logic scaffolded for Phase 1
  }
}
