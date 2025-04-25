import express from 'express';
declare const registerRunnerValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const deleteRunnerValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const getRunnerFromTokenValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
export { registerRunnerValidator, deleteRunnerValidator, getRunnerFromTokenValidator };
//# sourceMappingURL=runners.d.ts.map