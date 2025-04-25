import express from 'express';
declare const customConfigUpdateValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare function ensureConfigIsEditable(req: express.Request, res: express.Response, next: express.NextFunction): void;
export { customConfigUpdateValidator, ensureConfigIsEditable };
//# sourceMappingURL=config.d.ts.map