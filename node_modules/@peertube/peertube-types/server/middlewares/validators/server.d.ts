import express from 'express';
declare const serverGetValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const contactAdministratorValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
export { serverGetValidator, contactAdministratorValidator };
//# sourceMappingURL=server.d.ts.map