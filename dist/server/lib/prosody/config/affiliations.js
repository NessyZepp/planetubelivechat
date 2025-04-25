"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVideoAffiliations = getVideoAffiliations;
exports.getChannelAffiliations = getChannelAffiliations;
const domain_1 = require("./domain");
const channel_1 = require("../../database/channel");
const bot_1 = require("../../configuration/bot");
async function _getCommonAffiliations(options, _prosodyDomain) {
    const r = {};
    const settings = await options.settingsManager.getSettings([
        'disable-channel-configuration'
    ]);
    const useBots = !settings['disable-channel-configuration'];
    if (useBots) {
        r[bot_1.BotConfiguration.singleton().moderationBotJID()] = 'owner';
    }
    return r;
}
async function _addAffiliationByChannelId(options, prosodyDomain, r, channelId) {
    try {
        const username = await (0, channel_1.getUserNameByChannelId)(options, channelId);
        if (username === null) {
            options.peertubeHelpers.logger.error(`Failed to get the username for channelId '${channelId}'.`);
        }
        else {
            const userJid = username + '@' + prosodyDomain;
            r[userJid] = 'owner';
        }
    }
    catch (error) {
        options.peertubeHelpers.logger.error('Failed to get channel owner informations:', error);
    }
}
async function getVideoAffiliations(options, video) {
    const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
    const r = await _getCommonAffiliations(options, prosodyDomain);
    if (!video.remote) {
        await _addAffiliationByChannelId(options, prosodyDomain, r, video.channelId);
    }
    return r;
}
async function getChannelAffiliations(options, channelId) {
    const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
    const r = await _getCommonAffiliations(options, prosodyDomain);
    await _addAffiliationByChannelId(options, prosodyDomain, r, channelId);
    return r;
}
//# sourceMappingURL=affiliations.js.map