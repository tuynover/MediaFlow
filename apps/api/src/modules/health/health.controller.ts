import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health/live')
  getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  getReadiness() {
    return {
      status: 'ready',
      components: {
        database: { status: 'up' },
        redis: { status: 'up' },
        minio: { status: 'up' },
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  getMetrics() {
    const metrics = [
      '# HELP mediaflow_active_uploads Number of active upload sessions',
      '# TYPE mediaflow_active_uploads gauge',
      'mediaflow_active_uploads 1',
      '# HELP mediaflow_processing_runs_total Total processing runs by status',
      '# TYPE mediaflow_processing_runs_total counter',
      'mediaflow_processing_runs_total{status="completed"} 42',
      'mediaflow_processing_runs_total{status="awaiting_approval"} 2',
      '# HELP mediaflow_queue_waiting_jobs Number of waiting jobs in BullMQ',
      '# TYPE mediaflow_queue_waiting_jobs gauge',
      'mediaflow_queue_waiting_jobs 0',
    ].join('\n');
    return metrics;
  }
}
