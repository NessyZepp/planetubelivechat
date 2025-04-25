"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoBuildJSONLD = videoBuildJSONLD;
exports.videoContextBuildJSONLD = videoContextBuildJSONLD;
exports.serverBuildInfos = serverBuildInfos;
const storage_1 = require("./storage");
const video_1 = require("../../../shared/lib/video");
const webchat_1 = require("../uri/webchat");
const canonicalize_1 = require("../uri/canonicalize");
const domain_1 = require("../prosody/config/domain");
const custom_fields_1 = require("../custom-fields");
const emojis_1 = require("../emojis");
const loc_1 = require("../loc");
const debug_1 = require("../debug");
async function videoBuildJSONLD(options, videoJsonld, context) {
    const logger = options.peertubeHelpers.logger;
    const video = context.video;
    if (video.remote) {
        return videoJsonld;
    }
    const settings = await options.settingsManager.getSettings([
        'chat-per-live-video',
        'chat-all-lives',
        'chat-all-non-lives',
        'chat-videos-list',
        'disable-websocket',
        'prosody-room-type',
        'federation-dont-publish-remotely',
        'chat-no-anonymous',
        'prosody-room-allow-s2s',
        'prosody-s2s-port'
    ]);
    if (settings['federation-dont-publish-remotely']) {
        await (0, storage_1.storeVideoLiveChatInfos)(options, video, false);
        return videoJsonld;
    }
    await (0, custom_fields_1.fillVideoCustomFields)(options, video);
    const hasChat = (0, video_1.videoHasWebchat)({
        'chat-per-live-video': !!settings['chat-per-live-video'],
        'chat-all-lives': !!settings['chat-all-lives'],
        'chat-all-non-lives': !!settings['chat-all-non-lives'],
        'chat-videos-list': settings['chat-videos-list']
    }, video);
    if (!hasChat) {
        logger.debug(`Video uuid=${video.uuid} has not livechat, adding peertubeLiveChat=false.`);
        await (0, storage_1.storeVideoLiveChatInfos)(options, video, false);
        return videoJsonld;
    }
    logger.debug(`Adding LiveChat data on video uuid=${video.uuid}...`);
    const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
    let roomJID;
    if (settings['prosody-room-type'] === 'channel') {
        roomJID = `channel.${video.channelId}@room.${prosodyDomain}`;
    }
    else {
        roomJID = `${video.uuid}@room.${prosodyDomain}`;
    }
    const serverInfos = await _serverBuildInfos(options, {
        'federation-dont-publish-remotely': settings['federation-dont-publish-remotely'],
        'prosody-s2s-port': settings['prosody-s2s-port'],
        'prosody-room-allow-s2s': settings['prosody-room-allow-s2s'],
        'disable-websocket': settings['disable-websocket'],
        'chat-no-anonymous': settings['chat-no-anonymous']
    });
    const chatTitle = (0, loc_1.loc)('chat_for_live_stream') + ' ' + video.name;
    const discussionLinks = [];
    discussionLinks.push({
        type: 'Link',
        name: chatTitle,
        rel: 'discussion',
        href: (0, webchat_1.getPublicChatUri)(options, videoJsonld)
    });
    if (!!serverInfos.directs2s || (0, debug_1.isDebugMode)(options, 'alwaysPublishXMPPRoom')) {
        discussionLinks.push({
            type: 'Link',
            name: chatTitle,
            rel: 'discussion',
            href: 'xmpp://' + roomJID + '?join'
        });
    }
    if (!('attachment' in videoJsonld) || !videoJsonld.attachment) {
        Object.assign(videoJsonld, {
            attachment: discussionLinks
        });
    }
    else if (Array.isArray(videoJsonld.attachment)) {
        videoJsonld.attachment.push(...discussionLinks);
    }
    else {
        videoJsonld.attachment = [
            videoJsonld.attachment,
            ...discussionLinks
        ];
    }
    const links = [];
    if (serverInfos.anonymous) {
        if (serverInfos.anonymous.bosh) {
            links.push({
                type: 'xmpp-bosh-anonymous',
                url: serverInfos.anonymous.bosh,
                jid: serverInfos.anonymous.virtualhost
            });
        }
        if (serverInfos.anonymous.websocket) {
            links.push({
                type: 'xmpp-websocket-anonymous',
                url: serverInfos.anonymous.websocket,
                jid: serverInfos.anonymous.virtualhost
            });
        }
    }
    const peertubeLiveChat = {
        type: 'xmpp',
        jid: roomJID,
        links,
        xmppserver: serverInfos,
        customEmojisUrl: await emojis_1.Emojis.singletonSafe()?.channelCustomEmojisUrl(video.channelId)
    };
    Object.assign(videoJsonld, {
        peertubeLiveChat
    });
    await (0, storage_1.storeVideoLiveChatInfos)(options, video, peertubeLiveChat);
    return videoJsonld;
}
async function videoContextBuildJSONLD(_options, jsonld) {
    const entry = jsonld.find(e => typeof e === 'object' && ('isLiveBroadcast' in e));
    if (!entry) {
        return jsonld;
    }
    return jsonld.concat([{
            ptlc: 'urn:peertube-plugin-livechat',
            peertubeLiveChat: {
                '@id': 'ptlc:peertubeLiveChat', '@type': '@json'
            }
        }]);
}
async function serverBuildInfos(options) {
    const settings = await options.settingsManager.getSettings([
        'federation-dont-publish-remotely',
        'prosody-s2s-port',
        'prosody-room-allow-s2s',
        'disable-websocket',
        'chat-no-anonymous'
    ]);
    return _serverBuildInfos(options, {
        'federation-dont-publish-remotely': settings['federation-dont-publish-remotely'],
        'prosody-s2s-port': settings['prosody-s2s-port'],
        'prosody-room-allow-s2s': settings['prosody-room-allow-s2s'],
        'disable-websocket': settings['disable-websocket'],
        'chat-no-anonymous': settings['chat-no-anonymous']
    });
}
async function _serverBuildInfos(options, settings) {
    const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
    const mucDomain = 'room.' + prosodyDomain;
    const anonDomain = 'anon.' + prosodyDomain;
    const externalDomain = 'external.' + prosodyDomain;
    let directs2s;
    if (settings['prosody-room-allow-s2s'] && settings['prosody-s2s-port']) {
        directs2s = {
            port: settings['prosody-s2s-port'] ?? ''
        };
    }
    let websockets2s;
    if (!settings['federation-dont-publish-remotely']) {
        const wsS2SUri = (0, webchat_1.getWSS2SUri)(options);
        if (wsS2SUri) {
            websockets2s = {
                url: (0, canonicalize_1.canonicalizePluginUri)(options, wsS2SUri, {
                    removePluginVersion: true,
                    protocol: 'ws'
                })
            };
        }
    }
    let anonymous;
    if (!settings['chat-no-anonymous']) {
        anonymous = {
            bosh: (0, canonicalize_1.canonicalizePluginUri)(options, (0, webchat_1.getBoshUri)(options), { removePluginVersion: true }),
            virtualhost: anonDomain
        };
        if (!settings['disable-websocket']) {
            const wsUri = (0, webchat_1.getWSUri)(options);
            if (wsUri) {
                anonymous.websocket = (0, canonicalize_1.canonicalizePluginUri)(options, wsUri, {
                    removePluginVersion: true,
                    protocol: 'ws'
                });
            }
        }
    }
    return {
        host: prosodyDomain,
        muc: mucDomain,
        external: externalDomain,
        directs2s,
        websockets2s,
        anonymous
    };
}
//# sourceMappingURL=outgoing.js.map