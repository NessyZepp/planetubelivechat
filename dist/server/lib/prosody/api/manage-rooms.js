"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProsodyRooms = listProsodyRooms;
exports.updateProsodyRoom = updateProsodyRoom;
const host_1 = require("./host");
const apikey_1 = require("../../apikey");
const domain_1 = require("../config/domain");
const got = require('got');
async function listProsodyRooms(options) {
    const logger = options.peertubeHelpers.logger;
    const currentProsody = (0, host_1.getCurrentProsody)();
    if (!currentProsody) {
        throw new Error('It seems that prosody is not binded... Cant list rooms.');
    }
    const apiUrl = `http://localhost:${currentProsody.port}/peertubelivechat_manage_rooms/list-rooms`;
    logger.debug('Calling list rooms API on url: ' + apiUrl);
    const rooms = await got(apiUrl, {
        method: 'GET',
        headers: {
            authorization: 'Bearer ' + await (0, apikey_1.getAPIKey)(options),
            host: currentProsody.host
        },
        responseType: 'json',
        resolveBodyOnly: true
    });
    return rooms;
}
async function updateProsodyRoom(options, jid, data) {
    const logger = options.peertubeHelpers.logger;
    const currentProsody = (0, host_1.getCurrentProsody)();
    if (!currentProsody) {
        throw new Error('It seems that prosody is not binded... Cant update room.');
    }
    if (!jid.includes('@')) {
        jid = jid + '@room.' + await (0, domain_1.getProsodyDomain)(options);
    }
    logger.debug('Calling update room for ' + jid);
    const apiUrl = `http://localhost:${currentProsody.port}/peertubelivechat_manage_rooms/update-room`;
    const apiData = {
        jid
    };
    if (('name' in data) && data.name !== undefined) {
        apiData.name = data.name;
    }
    if (('slow_mode_duration' in data) && data.slow_mode_duration !== undefined) {
        apiData.slow_mode_duration = data.slow_mode_duration;
    }
    if (('moderation_delay' in data) && data.moderation_delay !== undefined) {
        apiData.moderation_delay = data.moderation_delay;
    }
    if ('livechat_muc_terms' in data) {
        apiData.livechat_muc_terms = data.livechat_muc_terms ?? '';
    }
    if ('livechat_emoji_only' in data) {
        apiData.livechat_emoji_only = data.livechat_emoji_only ?? false;
    }
    if ('livechat_custom_emoji_regexp' in data) {
        apiData.livechat_custom_emoji_regexp = data.livechat_custom_emoji_regexp ?? '';
    }
    if (('addAffiliations' in data) && data.addAffiliations !== undefined) {
        apiData.addAffiliations = data.addAffiliations;
    }
    if (('removeAffiliationsFor' in data) && data.removeAffiliationsFor !== undefined) {
        apiData.removeAffiliationsFor = data.removeAffiliationsFor;
    }
    try {
        logger.debug('Calling update room API on url: ' + apiUrl);
        const result = await got(apiUrl, {
            method: 'POST',
            headers: {
                authorization: 'Bearer ' + await (0, apikey_1.getAPIKey)(options),
                host: currentProsody.host
            },
            json: apiData,
            responseType: 'json',
            resolveBodyOnly: true
        });
        logger.debug('Update room API response: ' + JSON.stringify(result));
    }
    catch (err) {
        logger.error(`Failed to update room: ' ${err}`);
        return false;
    }
    return true;
}
//# sourceMappingURL=manage-rooms.js.map