import express from 'express';
declare const requestOrConfirmTwoFactorValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const confirmTwoFactorValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare const disableTwoFactorValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
export { requestOrConfirmTwoFactorValidator, confirmTwoFactorValidator, disableTwoFactorValidator };
//# sourceMappingURL=two-factor.d.ts.map