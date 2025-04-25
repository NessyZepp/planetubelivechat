import express from 'express';
declare const userSubscriptionListValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare const userSubscriptionAddValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare const areSubscriptionsExistValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare const userSubscriptionGetValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const userSubscriptionDeleteValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
export { areSubscriptionsExistValidator, userSubscriptionListValidator, userSubscriptionAddValidator, userSubscriptionGetValidator, userSubscriptionDeleteValidator };
//# sourceMappingURL=user-subscriptions.d.ts.map