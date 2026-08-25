import { Controller, Post, Get, Param, Body, Req, BadRequestException } from '@nestjs/common';
import { PublishService } from './publish.service';

@Controller('api/v1')
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  @Post('publish/trigger')
  async triggerPublish(@Req() request: any, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    if (!body.runId || !body.sourceAssetId) {
      throw new BadRequestException({ error: { code: 'VALIDATION_ERROR', message: 'runId and sourceAssetId are required' } });
    }
    return this.publishService.triggerPublish(
      workspaceId,
      body.runId,
      body.sourceAssetId,
      body.profile || '720p',
      body.simulateResponseLoss || false
    );
  }

  @Post('runs/:runId/publish')
  async triggerPublishForRun(@Req() request: any, @Param('runId') runId: string, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    return this.publishService.triggerPublish(
      workspaceId,
      runId,
      body.sourceAssetId || 'asset_demo',
      body.profile || '720p',
      body.simulateResponseLoss || false
    );
  }

  @Post('publish/:operationId/reconcile')
  async reconcileOperation(@Req() request: any, @Param('operationId') operationId: string, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    return this.publishService.reconcileOperation(workspaceId, operationId, body.reason || 'Operator HEAD verification');
  }

  @Get('publish/operations')
  async getOperations(@Req() request: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const operations = await this.publishService.getOperations(workspaceId);
    return { operations };
  }
}
