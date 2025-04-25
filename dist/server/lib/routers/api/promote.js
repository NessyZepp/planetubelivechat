"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPromoteApiRouter = initPromoteApiRouter;
const async_1 = require("../../middlewares/async");
const helpers_1 = require("../../helpers");
const domain_1 = require("../../prosody/config/domain");
const manage_rooms_1 = require("../../prosody/api/manage-rooms");
async function initPromoteApiRouter(options, router) {
    const logger = options.peertubeHelpers.logger;
    router.put('/promote/:roomJID', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        try {
            const roomJIDLocalPart = req.params.roomJID;
            const user = await options.peertubeHelpers.user.getAuthUser(res);
            if (!user || !await (0, helpers_1.isUserAdminOrModerator)(options, res)) {
                logger.warn('Current user tries to access the promote API for which they has no right.');
                res.sendStatus(403);
                return;
            }
            if (!/^(channel\.\d+|(\w|-)+)$/.test(roomJIDLocalPart)) {
                logger.warn('Current user tries to access the promote API using an invalid room key.');
                res.sendStatus(400);
                return;
            }
            const normalizedUsername = user.username.toLowerCase();
            const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
            const jid = normalizedUsername + '@' + prosodyDomain;
            const mucJID = roomJIDLocalPart + '@' + 'room.' + prosodyDomain;
            logger.info('We must give owner affiliation to ' + jid + ' on ' + mucJID);
            const addAffiliations = {};
            addAffiliations[jid] = 'owner';
            await (0, manage_rooms_1.updateProsodyRoom)(options, mucJID, {
                addAffiliations
            });
            res.sendStatus(200);
        }
        catch (err) {
            logger.error(err);
            res.sendStatus(500);
        }
    }));
}
//# sourceMappingURL=promote.js.map