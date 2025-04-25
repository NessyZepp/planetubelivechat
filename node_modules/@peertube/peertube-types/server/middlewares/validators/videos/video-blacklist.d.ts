import express from 'express';
declare const videosBlacklistRemoveValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const videosBlacklistAddValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const videosBlacklistUpdateValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const videosBlacklistFiltersValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
export { videosBlacklistAddValidator, videosBlacklistRemoveValidator, videosBlacklistUpdateValidator, videosBlacklistFiltersValidator };
//# sourceMappingURL=video-blacklist.d.ts.map