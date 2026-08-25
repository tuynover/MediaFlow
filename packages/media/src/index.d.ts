export interface ProbeMetadata {
    durationMs: number;
    width: number;
    height: number;
    videoCodec: string;
    audioCodec: string | null;
    sizeBytes: number;
    formatName: string;
}
export declare class MediaProcessor {
    static parseProbeData(probeJson: any, sizeBytes: number): ProbeMetadata;
    static getThumbnailArgs(inputPath: string, outputPath: string): string[];
    static getTranscodeArgs(inputPath: string, outputPath: string, targetHeight: number): string[];
    static parseProgressLine(line: string, totalDurationMs: number): number | null;
}
//# sourceMappingURL=index.d.ts.map