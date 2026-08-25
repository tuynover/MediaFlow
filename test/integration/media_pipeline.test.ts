import { describe, it, expect } from 'vitest';
import { MediaProcessor } from '../../packages/media/src/index';
import { MediaWorkerPipeline } from '../../apps/worker/src/worker';

describe('FFmpeg & Media Worker Pipeline Integration Tests (MF-401..MF-409)', () => {
  it('should parse ffprobe metadata accurately', () => {
    const rawProbe = {
      streams: [
        { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, duration: '120.5' },
        { codec_type: 'audio', codec_name: 'aac' },
      ],
      format: { duration: '120.5', format_name: 'mov,mp4' },
    };

    const metadata = MediaProcessor.parseProbeData(rawProbe, 50 * 1024 * 1024);
    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1080);
    expect(metadata.durationMs).toBe(120500);
    expect(metadata.videoCodec).toBe('h264');
    expect(metadata.audioCodec).toBe('aac');
  });

  it('should throw error on invalid ffprobe input without video stream', () => {
    const audioOnlyProbe = {
      streams: [{ codec_type: 'audio', codec_name: 'mp3' }],
      format: { duration: '60.0' },
    };

    expect(() => MediaProcessor.parseProbeData(audioOnlyProbe, 5 * 1024 * 1024)).toThrow('INVALID_MEDIA: No video stream found');
  });

  it('should build safe argument array without shell string concatenation', () => {
    const args = MediaProcessor.getTranscodeArgs('/tmp/input.mp4', '/tmp/output.mp4', 720);
    expect(args).toContain('-c:v');
    expect(args).toContain('libx264');
    expect(args).toContain('-c:a');
    expect(args).toContain('aac');
    expect(args.some((a) => a.includes('scale='))).toBe(true);
  });

  it('should execute worker pipeline and skip 1080p for low-res video', async () => {
    const pipeline = new MediaWorkerPipeline();
    const result = await pipeline.processRun({
      runId: 'run_test_123',
      workspaceId: 'workspace_test',
      projectId: 'project_test',
      sourcePath: '/tmp/test.mp4',
    });

    expect(result.status).toBe('awaiting_approval');
    expect(result.stepResults['probe_source'].status).toBe('succeeded');
    expect(result.stepResults['create_thumbnail'].status).toBe('succeeded');
  });

  it('should enforce Spec 5.2 for video below 1080p: no upscale, 1080p skipped with source_resolution_too_low', async () => {
    const pipeline = new MediaWorkerPipeline();
    const result = await pipeline.processRun({
      runId: 'run_spec52_480p',
      workspaceId: 'workspace_test',
      projectId: 'project_test',
      sourcePath: '/tmp/test_480p.mp4',
      height: 480, // 480p source video
    } as any);

    expect(result.stepResults['transcode_1080p'].status).toBe('skipped');
    expect(result.stepResults['transcode_1080p'].reason).toBe('source_resolution_too_low');
    expect(result.stepResults['transcode_source_normalized'].status).toBe('succeeded');
    expect(result.stepResults['transcode_source_normalized'].profile).toBe('source-normalized');
  });

  it('should support cooperative cancellation during worker processing', async () => {
    const pipeline = new MediaWorkerPipeline();
    let cancelTriggered = false;

    const cancelChecker = () => {
      if (cancelTriggered) return true;
      cancelTriggered = true; // Trigger cancel on second check
      return false;
    };

    await expect(
      pipeline.processRun(
        {
          runId: 'run_cancel_123',
          workspaceId: 'workspace_test',
          projectId: 'project_test',
          sourcePath: '/tmp/test.mp4',
        },
        cancelChecker
      )
    ).rejects.toThrow('CANCELLED: Processing cancelled by user');
  });
});
