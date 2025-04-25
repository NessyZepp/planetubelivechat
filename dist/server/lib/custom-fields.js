"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCustomFields = initCustomFields;
exports.fillVideoCustomFields = fillVideoCustomFields;
exports.fillVideoRemoteLiveChat = fillVideoRemoteLiveChat;
const storage_1 = require("./federation/storage");
const connection_infos_1 = require("./federation/connection-infos");
async function initCustomFields(options) {
    const registerHook = options.registerHook;
    const storageManager = options.storageManager;
    const logger = options.peertubeHelpers.logger;
    registerHook({
        target: 'action:api.live-video.created',
        handler: async ({ video, req }) => {
            if (!video?.id) {
                return;
            }
            if (!req || (typeof req !== 'object') || !('body' in req)) {
                return;
            }
            if (!req.body || (typeof req.body !== 'object') || !('pluginData' in req.body)) {
                return;
            }
            const pluginData = req.body?.pluginData;
            if (!pluginData || (typeof pluginData !== 'object') || !('livechat-active' in pluginData)) {
                return;
            }
            if (pluginData['livechat-active'] !== true) {
                return;
            }
            const setting = await options.settingsManager.getSetting('chat-per-live-video');
            if (setting !== true) {
                return;
            }
            logger.info('New live created, livechat-active parameter given, ' +
                `enabling chat by default by setting livechat-active=true for video ${video.id.toString()}.`);
            await storageManager.storeData(`livechat-active-${video.id.toString()}`, true);
        }
    });
    registerHook({
        target: 'action:api.video.updated',
        handler: async (params) => {
            logger.debug('Saving a video, checking for custom fields');
            const body = params.body;
            const video = params.video;
            if (!video?.id) {
                return;
            }
            if (!body.pluginData)
                return;
            const value = body.pluginData['livechat-active'];
            if (value === true || value === 'true') {
                logger.info(`Saving livechat-active=true for video ${video.id.toString()}`);
                await storageManager.storeData(`livechat-active-${video.id.toString()}`, true);
            }
            else if (value === false || value === 'false' || value === 'null') {
                logger.info(`Saving livechat-active=false for video ${video.id.toString()}`);
                await storageManager.storeData(`livechat-active-${video.id.toString()}`, false);
            }
            else {
                logger.error('Unknown value ' + JSON.stringify(value) + ' for livechat-active field.');
            }
        }
    });
    registerHook({
        target: 'filter:api.video.get.result',
        handler: async (video) => {
            logger.debug('Getting a video, searching for custom fields and data');
            await fillVideoCustomFields(options, video);
            if (!video.isLocal) {
                await fillVideoRemoteLiveChat(options, video);
            }
            return video;
        }
    });
}
async function fillVideoCustomFields(options, video) {
    if (!video)
        return video;
    if (!video.pluginData)
        video.pluginData = {};
    if (!video.id)
        return;
    const storageManager = options.storageManager;
    const logger = options.peertubeHelpers.logger;
    if (video.isLive) {
        const result = await storageManager.getData(`livechat-active-${video.id}`);
        logger.debug(`Video ${video.id} has livechat-active=` + JSON.stringify(result));
        if (result === true || result === 'true') {
            video.pluginData['livechat-active'] = true;
        }
        else if (result === false || result === 'false' || result === 'null') {
            video.pluginData['livechat-active'] = false;
        }
    }
}
async function fillVideoRemoteLiveChat(options, video) {
    if (('remote' in video) && !video.remote) {
        return;
    }
    if (('isLocal' in video) && video.isLocal) {
        return;
    }
    const infos = await (0, storage_1.getVideoLiveChatInfos)(options, video);
    if (!infos) {
        return;
    }
    let ok = false;
    if ((0, connection_infos_1.anonymousConnectionInfos)(infos)) {
        ok = true;
    }
    else {
        const settings = await options.settingsManager.getSettings([
            'federation-no-remote-chat',
            'prosody-room-allow-s2s',
            'disable-websocket'
        ]);
        const canWebsocketS2S = !settings['federation-no-remote-chat'] && !settings['disable-websocket'];
        const canDirectS2S = !settings['federation-no-remote-chat'] && !!settings['prosody-room-allow-s2s'];
        if ((0, connection_infos_1.compatibleRemoteAuthenticatedConnectionEnabled)(infos, canWebsocketS2S, canDirectS2S)) {
            ok = true;
        }
    }
    if (!ok) {
        return;
    }
    const v = video;
    if (!v.pluginData)
        v.pluginData = {};
    v.pluginData['livechat-remote'] = true;
}
//# sourceMappingURL=custom-fields.js.map