import { Controller, Post, Get, Param, Body, Req, BadRequestException } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';

@Controller('api/v1')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post('runs/:runId/approve')
  async approveRun(@Req() request: any, @Param('runId') runId: string, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const userId = request.headers['x-user-id'] || '11111111-1111-7111-a111-222222222222';
    return this.approvalsService.approveRun(workspaceId, runId, userId, body.note);
  }

  @Post('runs/:runId/reject')
  async rejectRun(@Req() request: any, @Param('runId') runId: string, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const userId = request.headers['x-user-id'] || '11111111-1111-7111-a111-222222222222';
    if (!body.reason) {
      throw new BadRequestException({ error: { code: 'VALIDATION_ERROR', message: 'Rejection reason is required' } });
    }
    return this.approvalsService.rejectRun(workspaceId, runId, userId, body.reason);
  }

  @Get('reviewer/inbox')
  async getInbox(@Req() request: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const runs = this.approvalsService.getReviewerInbox(workspaceId);
    return { runs };
  }
}
