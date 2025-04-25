declare class ActorFollowHealthCache {
    private static instance;
    private pendingFollowsScore;
    private pendingBadServer;
    private pendingGoodServer;
    private readonly badInboxes;
    private constructor();
    static get Instance(): ActorFollowHealthCache;
    updateActorFollowsHealth(goodInboxes: string[], badInboxes: string[]): void;
    isBadInbox(inboxUrl: string): boolean;
    addBadServerId(serverId: number): void;
    getBadFollowingServerIds(): number[];
    clearBadFollowingServerIds(): void;
    addGoodServerId(serverId: number): void;
    getGoodFollowingServerIds(): number[];
    clearGoodFollowingServerIds(): void;
    getPendingFollowsScore(): {
        [url: string]: number;
    };
    clearPendingFollowsScore(): void;
}
export { ActorFollowHealthCache };
//# sourceMappingURL=actor-follow-health-cache.d.ts.map