import express from 'express';
declare const abuseReportValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const abuseGetValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const abuseUpdateValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const abuseListForAdminsValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare const abuseListForUserValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare const getAbuseValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
declare const checkAbuseValidForMessagesValidator: ((req: express.Request, res: express.Response, next: express.NextFunction) => void)[];
declare const addAbuseMessageValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => void))[];
declare const deleteAbuseMessageValidator: (import("express-validator").ValidationChain | ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>))[];
export { abuseListForAdminsValidator, abuseReportValidator, abuseGetValidator, addAbuseMessageValidator, checkAbuseValidForMessagesValidator, abuseUpdateValidator, deleteAbuseMessageValidator, abuseListForUserValidator, getAbuseValidator };
//# sourceMappingURL=abuse.d.ts.map