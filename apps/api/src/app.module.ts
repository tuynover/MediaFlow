import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [AuthModule, ProjectsModule, UploadsModule],
})
export class AppModule {}
