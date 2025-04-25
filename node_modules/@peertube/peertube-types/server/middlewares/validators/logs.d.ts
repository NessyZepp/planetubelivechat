import express from 'express';
declare const createClientLogValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void | express.Response<any>))[];
declare const getLogsValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare const getAuditLogsValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
export { getLogsValidator, getAuditLogsValidator, createClientLogValidator };
//# sourceMappingURL=logs.d.ts.map