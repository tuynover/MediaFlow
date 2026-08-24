import { Controller, Get, Param, Query, Req, Res, Headers } from '@nestjs/common';
import { Response } from 'express';
import { RunsService } from '../runs/runs.service';

@Controller('api/v1/projects/:projectId/events')
export class RealtimeController {
  constructor(private readonly runsService: RunsService) {}

  @Get()
  async getEvents(@Req() request: any, @Param('projectId') projectId: string, @Query('lastEventId') lastEventId?: string) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const parsedId = lastEventId ? parseInt(lastEventId, 10) : undefined;
    const events = await this.runsService.getEvents(workspaceId, projectId, isNaN(parsedId!) ? undefined : parsedId);
    return { events };
  }

  @Get('stream')
  async streamEvents(
    @Req() request: any,
    @Res() response: Response,
    @Param('projectId') projectId: string,
    @Headers('last-event-id') lastEventIdHeader?: string
  ) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    
    // Set SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');

    const lastId = lastEventIdHeader ? parseInt(lastEventIdHeader, 10) : 0;
    const missedEvents = await this.runsService.getEvents(workspaceId, projectId, lastId);

    // Replay missed events
    for (const ev of missedEvents) {
      response.write(`id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev.data)}\n\n`);
    }

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      response.write(`: heartbeat ${new Date().toISOString()}\n\n`);
    }, 15000);

    request.on('close', () => {
      clearInterval(heartbeat);
      response.end();
    });
  }
}
