export interface BlockStatus {
    accounts: {
        [handle: string]: {
            blockedByServer: boolean;
            blockedByUser?: boolean;
        };
    };
    hosts: {
        [host: string]: {
            blockedByServer: boolean;
            blockedByUser?: boolean;
        };
    };
}
//# sourceMappingURL=block-status.model.d.ts.map