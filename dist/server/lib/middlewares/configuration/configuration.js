"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkConfigurationEnabledMiddleware = checkConfigurationEnabledMiddleware;
function checkConfigurationEnabledMiddleware(options) {
    return async (req, res, next) => {
        const settings = await options.settingsManager.getSettings([
            'disable-channel-configuration'
        ]);
        if (!settings['disable-channel-configuration']) {
            next();
            return;
        }
        options.peertubeHelpers.logger.info('Advanced Configuration is disabled, blocking the request.');
        res.sendStatus(403);
    };
}
//# sourceMappingURL=configuration.js.map