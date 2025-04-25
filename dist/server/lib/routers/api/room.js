"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRoomApiRouter = initRoomApiRouter;
const video_1 = require("../../../../shared/lib/video");
const async_1 = require("../../middlewares/async");
const apikey_1 = require("../../middlewares/apikey");
const affiliations_1 = require("../../prosody/config/affiliations");
const custom_fields_1 = require("../../custom-fields");
const channel_1 = require("../../database/channel");
const room_channel_1 = require("../../room-channel");
const storage_1 = require("../../configuration/channel/storage");
const emojis_1 = require("../../emojis");
async function _getChannelSpecificOptions(options, channelId) {
    const channelOptions = await (0, storage_1.getChannelConfigurationOptions)(options, channelId) ??
        (0, storage_1.getDefaultChannelConfigurationOptions)(options);
    const customEmojisRegexp = await emojis_1.Emojis.singletonSafe()?.getChannelCustomEmojisRegexp(channelId);
    return {
        slow_mode_duration: channelOptions.slowMode.duration,
        mute_anonymous: channelOptions.mute.anonymous,
        livechat_custom_emoji_regexp: customEmojisRegexp,
        livechat_muc_terms: channelOptions.terms,
        moderation_delay: channelOptions.moderation.delay,
        anonymize_moderation_actions: channelOptions.moderation.anonymize
    };
}
async function initRoomApiRouter(options, router) {
    const logger = options.peertubeHelpers.logger;
    router.get('/room', (0, async_1.asyncMiddleware)([
        (0, apikey_1.getCheckAPIKeyMiddleware)(options),
        async (req, res, _next) => {
            const jid = req.query.jid || '';
            logger.info(`Requesting room information for room '${jid}'.`);
            const settings = await options.settingsManager.getSettings([
                'prosody-room-type'
            ]);
            if (settings['prosody-room-type'] === 'channel') {
                const matches = jid.match(/^channel\.(\d+)$/);
                if (!matches?.[1]) {
                    logger.warn(`Invalid channel room jid '${jid}'.`);
                    res.sendStatus(403);
                    return;
                }
                const channelId = parseInt(matches[1]);
                const channelInfos = await (0, channel_1.getChannelInfosById)(options, channelId);
                if (!channelInfos) {
                    logger.warn(`Channel ${channelId} not found`);
                    res.sendStatus(403);
                    return;
                }
                let affiliations;
                try {
                    affiliations = await (0, affiliations_1.getChannelAffiliations)(options, channelId);
                }
                catch (error) {
                    logger.error(`Failed to get channel affiliations for ${channelId}:`, error);
                    affiliations = {};
                }
                const roomDefaults = {
                    config: Object.assign({
                        name: channelInfos.displayName,
                        description: ''
                    }, await _getChannelSpecificOptions(options, channelId)),
                    affiliations
                };
                room_channel_1.RoomChannel.singleton().link(channelId, jid);
                res.json(roomDefaults);
            }
            else {
                const video = await options.peertubeHelpers.videos.loadByIdOrUUID(jid);
                if (!video) {
                    logger.warn(`Video ${jid} not found`);
                    res.sendStatus(403);
                    return;
                }
                await (0, custom_fields_1.fillVideoCustomFields)(options, video);
                const settings = await options.settingsManager.getSettings([
                    'chat-per-live-video',
                    'chat-all-lives',
                    'chat-all-non-lives',
                    'chat-videos-list'
                ]);
                if (!(0, video_1.videoHasWebchat)({
                    'chat-per-live-video': !!settings['chat-per-live-video'],
                    'chat-all-lives': !!settings['chat-all-lives'],
                    'chat-all-non-lives': !!settings['chat-all-non-lives'],
                    'chat-videos-list': settings['chat-videos-list']
                }, video)) {
                    logger.warn(`Video ${jid} has not chat activated`);
                    res.sendStatus(403);
                    return;
                }
                let affiliations;
                try {
                    affiliations = await (0, affiliations_1.getVideoAffiliations)(options, video);
                }
                catch (error) {
                    logger.error(`Failed to get video affiliations for ${video.uuid}:`, error);
                    affiliations = {};
                }
                const roomDefaults = {
                    config: Object.assign({
                        name: video.name,
                        description: '',
                        language: video.language
                    }, await _getChannelSpecificOptions(options, video.channelId)),
                    affiliations
                };
                room_channel_1.RoomChannel.singleton().link(video.channelId, jid);
                res.json(roomDefaults);
            }
        }
    ]));
}
//# sourceMappingURL=room.js.map