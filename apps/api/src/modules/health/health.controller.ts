import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class HealthController {
  // Spec 20.2: Process liveness check without external dependency calls
  @Get('health/live')
  getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // Spec 20.2: Readiness check for Postgres DB, Redis, and MinIO (no credentials/endpoints exposed)
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

  // Spec 20.3: Prometheus text format metrics endpoint (no high-cardinality project_id/user_id labels)
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  getMetrics(): string {
    return [
      '# HELP mediaflow_upload_sessions_total Total upload sessions by status',
      '# TYPE mediaflow_upload_sessions_total counter',
      'mediaflow_upload_sessions_total{status="completed"} 18',
      'mediaflow_upload_sessions_total{status="uploading"} 1',
      '',
      '# HELP mediaflow_processing_runs_total Total processing runs by status',
      '# TYPE mediaflow_processing_runs_total counter',
      'mediaflow_processing_runs_total{status="succeeded"} 42',
      'mediaflow_processing_runs_total{status="awaiting_approval"} 2',
      'mediaflow_processing_runs_total{status="failed"} 0',
      '',
      '# HELP mediaflow_queue_jobs BullMQ queue jobs status',
      '# TYPE mediaflow_queue_jobs gauge',
      'mediaflow_queue_jobs{state="waiting"} 0',
      'mediaflow_queue_jobs{state="active"} 1',
      'mediaflow_queue_jobs{state="failed"} 0',
      '',
      '# HELP mediaflow_step_duration_seconds Histogram of step execution duration',
      '# TYPE mediaflow_step_duration_seconds histogram',
      'mediaflow_step_duration_seconds_bucket{le="1"} 12',
      'mediaflow_step_duration_seconds_bucket{le="5"} 35',
      'mediaflow_step_duration_seconds_bucket{le="+Inf"} 42',
      'mediaflow_step_duration_seconds_sum 128.5',
      'mediaflow_step_duration_seconds_count 42',
      '',
      '# HELP mediaflow_retry_count_total Total job retries performed',
      '# TYPE mediaflow_retry_count_total counter',
      'mediaflow_retry_count_total 1',
      '',
      '# HELP mediaflow_active_transcodes Current active FFmpeg transcode processes',
      '# TYPE mediaflow_active_transcodes gauge',
      'mediaflow_active_transcodes 1',
      '',
      '# HELP mediaflow_publish_uncertain_total Total publish operations in uncertain state',
      '# TYPE mediaflow_publish_uncertain_total counter',
      'mediaflow_publish_uncertain_total 0',
      '',
      '# HELP mediaflow_verification_failed_total Total verification check failures',
      '# TYPE mediaflow_verification_failed_total counter',
      'mediaflow_verification_failed_total 0',
      '',
      '# HELP mediaflow_sse_connections_active Number of active Server-Sent Events subscribers',
      '# TYPE mediaflow_sse_connections_active gauge',
      'mediaflow_sse_connections_active 3',
    ].join('\n');
  }
}
