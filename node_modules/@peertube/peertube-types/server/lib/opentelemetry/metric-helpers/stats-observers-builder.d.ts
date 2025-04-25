import { Meter } from '@opentelemetry/api';
export declare class StatsObserversBuilder {
    private readonly meter;
    private readonly getInstanceStats;
    constructor(meter: Meter);
    buildObservers(): void;
    private buildUserStatsObserver;
    private buildChannelStatsObserver;
    private buildVideoStatsObserver;
    private buildCommentStatsObserver;
    private buildPlaylistStatsObserver;
    private buildInstanceFollowsStatsObserver;
    private buildRedundancyStatsObserver;
    private buildActivityPubStatsObserver;
}
//# sourceMappingURL=stats-observers-builder.d.ts.map