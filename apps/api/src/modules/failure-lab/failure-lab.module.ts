import { Module } from '@nestjs/common';
import { FailureLabController } from './failure-lab.controller';
import { FailureLabService } from './failure-lab.service';

@Module({
  controllers: [FailureLabController],
  providers: [FailureLabService],
  exports: [FailureLabService],
})
export class FailureLabModule {}
