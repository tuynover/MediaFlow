import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RunsModule } from './modules/runs/runs.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';

@Module({
  imports: [AuthModule, ProjectsModule, UploadsModule, RunsModule, RealtimeModule, ApprovalsModule],
})
export class AppModule {}
