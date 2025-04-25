import express from 'express';
declare const usersAskSendVerifyEmailValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void | express.Response<any>>))[];
declare const usersVerifyEmailValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const registrationVerifyEmailValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
export { usersAskSendVerifyEmailValidator, usersVerifyEmailValidator, registrationVerifyEmailValidator };
//# sourceMappingURL=user-email-verification.d.ts.map