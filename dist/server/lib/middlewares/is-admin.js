"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUserIsAdminMiddleware = checkUserIsAdminMiddleware;
const helpers_1 = require("../helpers");
function checkUserIsAdminMiddleware(options) {
    return async (req, res, next) => {
        const logger = options.peertubeHelpers.logger;
        if (!await (0, helpers_1.isUserAdmin)(options, res)) {
            logger.warn('Current user tries to access a page only allowed for admins, and has no right.');
            res.sendStatus(403);
            return;
        }
        logger.debug('User is admin, can access the page..');
        next();
    };
}
//# sourceMappingURL=is-admin.js.map