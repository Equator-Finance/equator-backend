import { Module } from '@nestjs/common';
import { RfqGateway } from './rfq.gateway';
import { RfqService } from './rfq.service';

@Module({
  providers: [RfqGateway, RfqService],
  exports: [RfqService],
})
export class RfqModule {}
