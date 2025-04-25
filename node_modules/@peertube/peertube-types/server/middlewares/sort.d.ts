import express from 'express';
declare const setDefaultSort: (req: express.Request, res: express.Response, next: express.NextFunction) => void;
declare const setDefaultVideosSort: (req: express.Request, res: express.Response, next: express.NextFunction) => void;
declare const setDefaultVideoRedundanciesSort: (req: express.Request, res: express.Response, next: express.NextFunction) => void;
declare const setDefaultSearchSort: (req: express.Request, res: express.Response, next: express.NextFunction) => void;
declare const setBlacklistSort: (req: express.Request, res: express.Response, next: express.NextFunction) => void;
export { setDefaultSort, setDefaultSearchSort, setDefaultVideosSort, setDefaultVideoRedundanciesSort, setBlacklistSort };
//# sourceMappingURL=sort.d.ts.map