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
  static parseProbeData(probeJson: any, sizeBytes: number): ProbeMetadata {
    const streams = probeJson.streams || [];
    const format = probeJson.format || {};

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
      formatName: format.format_name || 'unknown',
    };
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
    if (line.startsWith('out_time_ms=')) {
      const timeMs = parseInt(line.split('=')[1], 10);
      if (!isNaN(timeMs) && totalDurationMs > 0) {
        const percent = (timeMs / (totalDurationMs * 1000)) * 100;
        return Math.min(Math.max(parseFloat(percent.toFixed(2)), 0), 100);
      }
    }
    return null;
  }
}
