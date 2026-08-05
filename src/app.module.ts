import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RfqModule } from './rfq/rfq.module';
import { IndexerModule } from './indexer/indexer.module';
import { RelayerModule } from './relayer/relayer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    RfqModule,
    IndexerModule,
    RelayerModule,
  ],
})
export class AppModule {}
