import express from 'express';
export declare const videoChannelsAddValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<false | void>))[];
export declare const videoChannelsUpdateValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
export declare const videoChannelsRemoveValidator: ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>)[];
export declare const videoChannelsNameWithHostValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
export declare const ensureIsLocalChannel: ((req: express.Request, res: express.Response, next: express.NextFunction) => void)[];
export declare const ensureChannelOwnerCanUpload: ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>)[];
export declare const videoChannelStatsValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
export declare const videoChannelsListValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
export declare const videoChannelImportVideosValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
//# sourceMappingURL=video-channels.d.ts.map