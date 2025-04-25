"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initChannelConfiguration = initChannelConfiguration;
const room_channel_1 = require("../../room-channel");
const custom_fields_1 = require("../../custom-fields");
const video_1 = require("../../../../shared/lib/video");
const manage_rooms_1 = require("../../prosody/api/manage-rooms");
const channel_1 = require("../../database/channel");
const emojis_1 = require("../../emojis");
async function initChannelConfiguration(options) {
    const logger = options.peertubeHelpers.logger;
    const registerHook = options.registerHook;
    logger.info('Registring room-channel hooks...');
    registerHook({
        target: 'action:api.video.deleted',
        handler: async (params) => {
            const video = params.video;
            if (video.remote) {
                return;
            }
            logger.info(`Video ${video.uuid} deleted, removing 'channel configuration' related stuff.`);
            try {
                room_channel_1.RoomChannel.singleton().removeRoom(video.uuid);
            }
            catch (err) {
                logger.error(err);
            }
        }
    });
    registerHook({
        target: 'action:api.video-channel.deleted',
        handler: async (params) => {
            const channelId = params.videoChannel.id;
            logger.info(`Channel ${channelId} deleted, removing 'channel configuration' related stuff.`);
            try {
                room_channel_1.RoomChannel.singleton().removeChannel(channelId);
            }
            catch (err) {
                logger.error(err);
            }
            logger.info(`Channel ${channelId} deleted, removing 'custom emojis' related stuff.`);
            try {
                await emojis_1.Emojis.singletonSafe()?.deleteChannelDefinition(channelId);
            }
            catch (err) {
                logger.error(err);
            }
        }
    });
    registerHook({
        target: 'action:api.video.updated',
        handler: async (params) => {
            const video = params.video;
            logger.info(`Video ${video.uuid} updated, updating room-channel informations.`);
            try {
                if (video.remote) {
                    return;
                }
                const settings = await options.settingsManager.getSettings([
                    'chat-per-live-video',
                    'chat-all-lives',
                    'chat-all-non-lives',
                    'chat-videos-list',
                    'prosody-room-type'
                ]);
                await (0, custom_fields_1.fillVideoCustomFields)(options, video);
                const hasChat = (0, video_1.videoHasWebchat)({
                    'chat-per-live-video': !!settings['chat-per-live-video'],
                    'chat-all-lives': !!settings['chat-all-lives'],
                    'chat-all-non-lives': !!settings['chat-all-non-lives'],
                    'chat-videos-list': settings['chat-videos-list']
                }, video);
                if (!hasChat) {
                    logger.debug(`Video ${video.uuid} has no chat, ensuring there is no room link`);
                    room_channel_1.RoomChannel.singleton().removeRoom(video.uuid);
                    return;
                }
                let roomLocalPart;
                if (settings['prosody-room-type'] === 'channel') {
                    roomLocalPart = 'channel.' + video.channelId.toString();
                }
                else {
                    roomLocalPart = video.uuid;
                }
                logger.debug(`Ensuring a room-channel link between room ${roomLocalPart} and channel ${video.channelId}`);
                room_channel_1.RoomChannel.singleton().link(video.channelId, roomLocalPart);
                if (settings['prosody-room-type'] === 'video') {
                    (0, manage_rooms_1.updateProsodyRoom)(options, video.uuid, {
                        name: video.name,
                        livechat_custom_emoji_regexp: await emojis_1.Emojis.singletonSafe()?.getChannelCustomEmojisRegexp(video.channelId)
                    }).then(() => { }, (err) => logger.error(err));
                }
            }
            catch (err) {
                logger.error(err);
            }
        }
    });
    registerHook({
        target: 'action:api.video-channel.updated',
        handler: async (params) => {
            const channel = await (0, channel_1.getChannelInfosById)(options, params.videoChannel.id, true);
            if (!channel) {
                return;
            }
            const settings = await options.settingsManager.getSettings([
                'prosody-room-type'
            ]);
            if (settings['prosody-room-type'] === 'channel') {
                const jid = 'channel.' + channel.id.toString();
                (0, manage_rooms_1.updateProsodyRoom)(options, jid, {
                    name: channel.displayName
                }).then(() => { }, (err) => logger.error(err));
            }
        }
    });
}
//# sourceMappingURL=init.js.map