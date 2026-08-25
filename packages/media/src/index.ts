import { spawn } from 'child_process';

export interface ProbeMetadata {
  durationMs: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string | null;
  sizeBytes: number;
  formatName: string;
}

export class MediaProcessor {
  // Parse ffprobe output safely
  // Spec 19: Parse ffprobe output safely with Container Whitelist, SSRF Prevention & Limits
  static parseProbeData(probeJson: any, sizeBytes: number, inputPath = ''): ProbeMetadata {
    // 1. Spec 19: Remote URL input check (SSRF Prevention)
    if (inputPath.startsWith('http://') || inputPath.startsWith('https://') || inputPath.startsWith('ftp://')) {
      throw new Error('SECURITY_ERROR: Remote URLs are strictly prohibited to prevent SSRF vulnerability');
    }

    const streams = probeJson.streams || [];
    const format = probeJson.format || {};

    // 2. Spec 19: Container Whitelist (MOV, MP4, MKV, WebM) strictly from ffprobe
    const ALLOWED_FORMATS = ['mov', 'mp4', 'm4a', '3gp', '3g2', 'mj2', 'matroska', 'webm', 'mkv'];
    const rawFormatName = format.format_name || 'mov';
    const formatName = rawFormatName.toLowerCase();
    const isAllowedFormat = ALLOWED_FORMATS.some((fmt) => formatName.includes(fmt));
    if (!isAllowedFormat) {
      throw new Error(`UNSUPPORTED_CODEC: Container format '${formatName}' is not in allowed whitelist (MOV, MP4, MKV, WebM)`);
    }

    const videoStream = streams.find((s: any) => s.codec_type === 'video');
    if (!videoStream) {
      throw new Error('INVALID_MEDIA: No video stream found in media file');
    }

    const audioStream = streams.find((s: any) => s.codec_type === 'audio');

    const durationSec = parseFloat(format.duration || videoStream.duration || '0');
    if (durationSec <= 0) {
      throw new Error('INVALID_MEDIA: Media duration is zero or invalid');
    }

    return {
      durationMs: Math.round(durationSec * 1000),
      width: parseInt(videoStream.width || '0', 10),
      height: parseInt(videoStream.height || '0', 10),
      videoCodec: videoStream.codec_name || 'unknown',
      audioCodec: audioStream ? audioStream.codec_name || null : null,
      sizeBytes,
      formatName,
    };
  }

  // Safe argument array for FFprobe (shell: false) according to Spec 12.4
  static getFFprobeArgs(inputPath: string): string[] {
    return ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', inputPath];
  }

  // Safe argument array for FFmpeg Thumbnail generation (shell: false)
  static getThumbnailArgs(inputPath: string, outputPath: string): string[] {
    return ['-y', '-ss', '00:00:01', '-i', inputPath, '-vframes', '1', '-q:v', '2', outputPath];
  }

  // Safe argument array for FFmpeg 720p / 1080p / source-normalized transcoding
  static getTranscodeArgs(inputPath: string, outputPath: string, targetHeight: number): string[] {
    const scaleFilter = `scale=-2:min(ih\\,${targetHeight})`;
    return [
      '-y',
      '-i',
      inputPath,
      '-vf',
      scaleFilter,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-progress',
      'pipe:1',
      outputPath,
    ];
  }

  // Parse FFmpeg progress pipe output lines
  static parseProgressLine(line: string, totalDurationMs: number): number | null {
    if (line.startsWith('out_time_us=') || line.startsWith('out_time_ms=')) {
      const parts = line.split('=');
      const timeUs = parseInt(parts[1], 10);
      const timeMs = line.startsWith('out_time_us=') ? Math.round(timeUs / 1000) : timeUs;
      if (!isNaN(timeMs) && totalDurationMs > 0) {
        const percent = (timeMs / totalDurationMs) * 100;
        return Math.min(Math.max(parseFloat(percent.toFixed(2)), 0), 100);
      }
    }
    return null;
  }

  // Spec 12.5: Progress Throttler to prevent DB/SSE write storms (max 1 write per 1000ms OR >= 1% progress delta)
  static shouldEmitProgress(lastEmitTimeMs: number, lastEmitPercent: number, currentTimeMs: number, currentPercent: number): boolean {
    if (currentPercent >= 100) return true;
    const timeDeltaMs = currentTimeMs - lastEmitTimeMs;
    const percentDelta = Math.abs(currentPercent - lastEmitPercent);
    return timeDeltaMs >= 1000 || percentDelta >= 1.0;
  }

  // Spec 5.4: Execute FFmpeg with Cooperative Cancellation (Polling every 1s, SIGTERM -> 10s -> SIGKILL)
  static async executeFFmpegWithCancellation(
    args: string[],
    cancelChecker: () => boolean,
    pollIntervalMs = 1000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('ffmpeg', args);
      let killed = false;

      const timer = setInterval(() => {
        if (cancelChecker() && !killed) {
          killed = true;
          clearInterval(timer);
          // Send SIGTERM first according to Spec 5.4
          child.kill('SIGTERM');
          // Wait max 10 seconds before SIGKILL if child has not exited
          const killTimer = setTimeout(() => {
            try {
              child.kill('SIGKILL');
            } catch (e) {
              // Ignore process cleanup errors
            }
          }, 10000);
          child.on('exit', () => clearTimeout(killTimer));
          reject(new Error('CANCELLED: FFmpeg process terminated by user cancellation request (SIGTERM sent)'));
        }
      }, pollIntervalMs);

      child.on('exit', (code: number | null) => {
        clearInterval(timer);
        if (!killed) {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      child.on('error', (err: any) => {
        clearInterval(timer);
        if (!killed) reject(err);
      });
    });
  }
}
