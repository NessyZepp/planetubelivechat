import express from 'express';
declare function apiFailMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void;
declare function handleStaticError(err: any, req: express.Request, res: express.Response, next: express.NextFunction): void;
export { apiFailMiddleware, handleStaticError };
//# sourceMappingURL=error.d.ts.map