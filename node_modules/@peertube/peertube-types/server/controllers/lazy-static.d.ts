import express from 'express';
declare const lazyStaticRouter: import("express-serve-static-core").Router;
export { lazyStaticRouter, getPreview, getVideoCaption };
declare function getPreview(req: express.Request, res: express.Response): Promise<void | express.Response<any>>;
declare function getVideoCaption(req: express.Request, res: express.Response): Promise<void | express.Response<any>>;
//# sourceMappingURL=lazy-static.d.ts.map