import express from 'express';
declare const listFollowsValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare const followValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void | express.Response<any>))[];
declare const removeFollowingValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const getFollowerValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const acceptFollowerValidator: ((req: express.Request, res: express.Response, next: express.NextFunction) => void)[];
declare const rejectFollowerValidator: ((req: express.Request, res: express.Response, next: express.NextFunction) => void)[];
export { followValidator, removeFollowingValidator, getFollowerValidator, acceptFollowerValidator, rejectFollowerValidator, listFollowsValidator };
//# sourceMappingURL=follows.d.ts.map