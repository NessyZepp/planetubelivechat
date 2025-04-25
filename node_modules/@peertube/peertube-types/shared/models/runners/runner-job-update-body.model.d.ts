export interface RunnerJobUpdateBody {
    runnerToken: string;
    jobToken: string;
    progress?: number;
    payload?: RunnerJobUpdatePayload;
}
export type RunnerJobUpdatePayload = LiveRTMPHLSTranscodingUpdatePayload;
export interface LiveRTMPHLSTranscodingUpdatePayload {
    type: 'add-chunk' | 'remove-chunk';
    masterPlaylistFile?: Blob | string;
    resolutionPlaylistFilename?: string;
    resolutionPlaylistFile?: Blob | string;
    videoChunkFilename: string;
    videoChunkFile?: Blob | string;
}
export declare function isLiveRTMPHLSTranscodingUpdatePayload(value: RunnerJobUpdatePayload): value is LiveRTMPHLSTranscodingUpdatePayload;
//# sourceMappingURL=runner-job-update-body.model.d.ts.map