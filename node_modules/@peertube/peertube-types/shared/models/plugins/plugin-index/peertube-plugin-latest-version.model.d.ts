export interface PeertubePluginLatestVersionRequest {
    currentPeerTubeEngine?: string;
    npmNames: string[];
}
export type PeertubePluginLatestVersionResponse = {
    npmName: string;
    latestVersion: string | null;
}[];
//# sourceMappingURL=peertube-plugin-latest-version.model.d.ts.map