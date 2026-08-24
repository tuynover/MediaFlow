import { Controller, Post, Get, Body, Req, BadRequestException } from '@nestjs/common';
import { FailureLabService } from './failure-lab.service';

@Controller('api/v1/failure-lab')
export class FailureLabController {
  constructor(private readonly failureLabService: FailureLabService) {}

  @Post('faults')
  async configureFault(@Req() request: any, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const userId = request.headers['x-user-id'] || '11111111-1111-7111-a111-111111111111';

    if (!body.scenario) {
      throw new BadRequestException({ error: { code: 'VALIDATION_ERROR', message: 'scenario is required' } });
    }

    return this.failureLabService.configureFault(
      workspaceId,
      userId,
      body.scenario,
      body.threshold || 50,
      body.remainingUses || 1,
      body.runId
    );
  }

  @Get('faults')
  async getFaults(@Req() request: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const faults = this.failureLabService.getFaults(workspaceId);
    return { faults };
  }
}
