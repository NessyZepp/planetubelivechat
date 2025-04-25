import express from 'express';
declare const paginationValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare function paginationValidatorBuilder(tags?: string[]): (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
export { paginationValidator, paginationValidatorBuilder };
//# sourceMappingURL=pagination.d.ts.map