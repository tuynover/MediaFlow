import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RunsModule } from '../runs/runs.module';

@Module({
  imports: [RunsModule],
  controllers: [RealtimeController],
})
export class RealtimeModule {}
