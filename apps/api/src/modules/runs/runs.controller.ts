import { Controller, Post, Get, Param, Body, Req, BadRequestException } from '@nestjs/common';
import { RunsService } from './runs.service';

@Controller('api/v1')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post('projects/:projectId/process')
  async triggerProcessing(@Req() request: any, @Param('projectId') projectId: string, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const sourceAssetId = body.sourceAssetId || crypto.randomUUID();
    return this.runsService.createProcessingRun(workspaceId, projectId, sourceAssetId);
  }

  @Post('projects/:projectId/cancel')
  async cancelProcessing(@Req() request: any, @Param('projectId') projectId: string, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    if (!body.runId) {
      throw new BadRequestException({ error: { code: 'VALIDATION_ERROR', message: 'runId is required' } });
    }
    return this.runsService.cancelProcessingRun(workspaceId, projectId, body.runId, body.reason || 'User cancelled');
  }

  @Get('operator/runs')
  async listOperatorRuns(@Req() request: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const runs = await this.runsService.getRuns(workspaceId);
    return { runs };
  }
}
