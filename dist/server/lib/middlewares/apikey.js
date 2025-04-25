"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCheckAPIKeyMiddleware = getCheckAPIKeyMiddleware;
const apikey_1 = require("../apikey");
function getCheckAPIKeyMiddleware(options) {
    return async (req, res, next) => {
        const key = req.query.apikey;
        const apikey = await (0, apikey_1.getAPIKey)(options);
        if (key !== apikey) {
            options.peertubeHelpers.logger.warn('Invalid APIKEY');
            res.sendStatus(403);
            return;
        }
        next();
    };
}
//# sourceMappingURL=apikey.js.map