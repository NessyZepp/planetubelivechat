"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRSS = initRSS;
const video_1 = require("../../../shared/lib/video");
const custom_fields_1 = require("../custom-fields");
const domain_1 = require("../prosody/config/domain");
const webchat_1 = require("../uri/webchat");
const debug_1 = require("../debug");
async function initRSS(options) {
    const logger = options.peertubeHelpers.logger;
    const registerHook = options.registerHook;
    logger.info('Registring RSS hooks...');
    registerHook({
        target: 'filter:feed.podcast.video.create-custom-tags.result',
        handler: async (result, { video, liveItem }) => {
            if (!liveItem && !(0, debug_1.isDebugMode)(options, 'enablePodcastChatTagForNonLive')) {
                return result;
            }
            const settings = await options.settingsManager.getSettings([
                'chat-per-live-video',
                'chat-all-lives',
                'chat-all-non-lives',
                'chat-videos-list',
                'prosody-room-type',
                'federation-dont-publish-remotely',
                'prosody-room-allow-s2s',
                'prosody-s2s-port'
            ]);
            if (settings['federation-dont-publish-remotely']) {
                return result;
            }
            await (0, custom_fields_1.fillVideoCustomFields)(options, video);
            const hasChat = (0, video_1.videoHasWebchat)({
                'chat-per-live-video': !!settings['chat-per-live-video'],
                'chat-all-lives': !!settings['chat-all-lives'],
                'chat-all-non-lives': !!settings['chat-all-non-lives'],
                'chat-videos-list': settings['chat-videos-list']
            }, video);
            if (!hasChat) {
                logger.debug(`Video uuid=${video.uuid} has not livechat, no need to add podcast:chat tag.`);
                return result;
            }
            const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
            const podcastChat = {
                name: 'podcast:chat',
                attributes: {
                    server: prosodyDomain,
                    protocol: 'xmpp',
                    embedUrl: (0, webchat_1.getPublicChatUri)(options, video)
                }
            };
            if ((settings['prosody-room-allow-s2s'] && settings['prosody-s2s-port']) ||
                (0, debug_1.isDebugMode)(options, 'alwaysPublishXMPPRoom')) {
                let roomJID;
                if (settings['prosody-room-type'] === 'channel') {
                    roomJID = `channel.${video.channel.id}@room.${prosodyDomain}`;
                }
                else {
                    roomJID = `${video.uuid}@room.${prosodyDomain}`;
                }
                podcastChat.attributes.space = roomJID;
            }
            return result.concat([podcastChat]);
        }
    });
}
//# sourceMappingURL=init.js.map