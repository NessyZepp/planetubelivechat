"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCheckConfigurationChannelMiddleware = getCheckConfigurationChannelMiddleware;
const channel_1 = require("../../database/channel");
const helpers_1 = require("../../helpers");
function getCheckConfigurationChannelMiddleware(options) {
    return async (req, res, next) => {
        const logger = options.peertubeHelpers.logger;
        const channelId = req.params.channelId;
        const currentUser = await options.peertubeHelpers.user.getAuthUser(res);
        if (!channelId || !/^\d+$/.test(channelId)) {
            res.sendStatus(400);
            return;
        }
        const channelInfos = await (0, channel_1.getChannelInfosById)(options, parseInt(channelId), true);
        if (!channelInfos) {
            logger.warn(`Channel ${channelId} not found`);
            res.sendStatus(404);
            return;
        }
        if (channelInfos.ownerAccountId === currentUser.Account.id) {
            logger.debug('Current user is the channel owner');
        }
        else if (await (0, helpers_1.isUserAdminOrModerator)(options, res)) {
            logger.debug('Current user is an instance moderator or admin');
        }
        else {
            logger.warn('Current user tries to access a channel for which they has no right.');
            res.sendStatus(403);
            return;
        }
        logger.debug('User can access the configuration channel api.');
        res.locals.channelInfos = channelInfos;
        next();
    };
}
//# sourceMappingURL=channel.js.map