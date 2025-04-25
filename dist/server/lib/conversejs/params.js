"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConverseJSParams = getConverseJSParams;
const channel_1 = require("../database/channel");
const connection_infos_1 = require("../federation/connection-infos");
const storage_1 = require("../federation/storage");
const helpers_1 = require("../helpers");
const domain_1 = require("../prosody/config/domain");
const webchat_1 = require("../uri/webchat");
const oidc_1 = require("../external-auth/oidc");
const emojis_1 = require("../emojis");
async function getConverseJSParams(options, roomKey, params, userIsConnected) {
    const settings = await options.settingsManager.getSettings([
        'prosody-room-type',
        'disable-websocket',
        'converse-theme',
        'federation-no-remote-chat',
        'prosody-room-allow-s2s',
        'chat-no-anonymous',
        'disable-channel-configuration'
    ]);
    if (settings['chat-no-anonymous'] && userIsConnected === false) {
        return {
            isError: true,
            code: 403,
            message: 'You must be connected'
        };
    }
    const { autoViewerMode, forceReadonly, transparent, converseJSTheme } = _interfaceParams(options, settings, params);
    const staticBaseUrl = (0, helpers_1.getBaseStaticRoute)(options);
    const authenticationUrl = options.peertubeHelpers.config.getWebserverUrl() +
        (0, helpers_1.getBaseRouterRoute)(options) +
        'api/auth';
    const roomInfos = await _readRoomKey(options, settings, roomKey);
    if ('isError' in roomInfos) {
        return roomInfos;
    }
    const connectionInfos = await _connectionInfos(options, settings, params, roomInfos);
    if ('isError' in connectionInfos) {
        return connectionInfos;
    }
    const { localAnonymousJID, localBoshUri, localWsUri, remoteConnectionInfos, roomJID } = connectionInfos;
    let externalAuthOIDC;
    if (userIsConnected !== true) {
        if (remoteConnectionInfos && !remoteConnectionInfos.externalAuthCompatible) {
            options.peertubeHelpers.logger.debug('The remote livechat plugin is not compatible with external authentication, not enabling the feature');
        }
        else {
            try {
                const oidcs = oidc_1.ExternalAuthOIDC.allSingletons();
                for (const oidc of oidcs) {
                    if (await oidc.isOk()) {
                        const authUrl = oidc.getConnectUrl();
                        const buttonLabel = oidc.getButtonLabel();
                        if (authUrl && buttonLabel) {
                            externalAuthOIDC ??= [];
                            externalAuthOIDC.push({
                                type: oidc.type,
                                buttonLabel,
                                url: authUrl
                            });
                        }
                    }
                }
            }
            catch (err) {
                options.peertubeHelpers.logger.error(err);
            }
        }
    }
    return {
        peertubeVideoOriginalUrl: roomInfos.video?.url,
        peertubeVideoUUID: roomInfos.video?.uuid,
        staticBaseUrl,
        assetsPath: staticBaseUrl + 'conversejs/',
        isRemoteChat: !!(roomInfos.video?.remote),
        localAnonymousJID: !settings['chat-no-anonymous'] ? localAnonymousJID : null,
        remoteAnonymousJID: remoteConnectionInfos?.anonymous?.userJID ?? null,
        remoteAnonymousXMPPServer: !!(remoteConnectionInfos?.anonymous),
        remoteAuthenticatedXMPPServer: !!(remoteConnectionInfos?.authenticated),
        room: roomJID,
        localBoshServiceUrl: localBoshUri,
        localWebsocketServiceUrl: localWsUri,
        remoteBoshServiceUrl: remoteConnectionInfos?.anonymous?.boshUri ?? null,
        remoteWebsocketServiceUrl: remoteConnectionInfos?.anonymous?.wsUri ?? null,
        authenticationUrl,
        autoViewerMode,
        theme: converseJSTheme,
        forceReadonly,
        transparent,
        forceDefaultHideMucParticipants: params.forceDefaultHideMucParticipants,
        externalAuthOIDC,
        customEmojisUrl: connectionInfos.customEmojisUrl
    };
}
function _interfaceParams(options, settings, params) {
    let autoViewerMode = false;
    const forceReadonly = params.readonly ?? false;
    if (!forceReadonly) {
        autoViewerMode = true;
    }
    let converseJSTheme = settings['converse-theme'];
    const transparent = params.transparent ?? false;
    if (!/^\w+$/.test(converseJSTheme)) {
        converseJSTheme = 'peertube';
    }
    return {
        autoViewerMode,
        forceReadonly,
        transparent,
        converseJSTheme
    };
}
async function _readRoomKey(options, settings, roomKey) {
    let video;
    let channelId;
    let remoteChatInfos;
    const channelMatches = roomKey.match(/^channel\.(\d+)$/);
    if (channelMatches?.[1]) {
        channelId = parseInt(channelMatches[1]);
        const channelInfos = await (0, channel_1.getChannelInfosById)(options, channelId);
        if (!channelInfos) {
            return {
                isError: true,
                code: 404,
                message: 'Channel Not Found'
            };
        }
        channelId = channelInfos.id;
    }
    else {
        const uuid = roomKey;
        video = await options.peertubeHelpers.videos.loadByIdOrUUID(uuid);
        if (!video) {
            return {
                isError: true,
                code: 404,
                message: 'Not Found'
            };
        }
        if (video.remote) {
            remoteChatInfos = settings['federation-no-remote-chat'] ? false : await (0, storage_1.getVideoLiveChatInfos)(options, video);
            if (!remoteChatInfos) {
                return {
                    isError: true,
                    code: 404,
                    message: 'Not Found'
                };
            }
        }
        channelId = video.channelId;
    }
    return {
        video,
        channelId,
        remoteChatInfos,
        roomKey
    };
}
async function _connectionInfos(options, settings, params, roomInfos) {
    const { video, remoteChatInfos, channelId, roomKey } = roomInfos;
    const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
    const localAnonymousJID = 'anon.' + prosodyDomain;
    const localBoshUri = (0, webchat_1.getBoshUri)(options);
    const localWsUri = settings['disable-websocket']
        ? null
        : ((0, webchat_1.getWSUri)(options) ?? null);
    let remoteConnectionInfos;
    let roomJID;
    let customEmojisUrl;
    if (video?.remote) {
        const canWebsocketS2S = !settings['federation-no-remote-chat'] && !settings['disable-websocket'];
        const canDirectS2S = !settings['federation-no-remote-chat'] && !!settings['prosody-room-allow-s2s'];
        try {
            remoteConnectionInfos = await _remoteConnectionInfos(remoteChatInfos ?? false, canWebsocketS2S, canDirectS2S);
        }
        catch (err) {
            options.peertubeHelpers.logger.error(err);
            remoteConnectionInfos = undefined;
        }
        if (!remoteConnectionInfos) {
            return {
                isError: true,
                code: 404,
                message: 'No compatible way to connect to remote chat'
            };
        }
        roomJID = remoteConnectionInfos.roomJID;
        if (remoteChatInfos && remoteChatInfos.customEmojisUrl) {
            customEmojisUrl = remoteChatInfos.customEmojisUrl;
        }
    }
    else {
        try {
            roomJID = await _localRoomJID(options, settings, prosodyDomain, roomKey, video, channelId, params.forcetype ?? false);
            if (video?.channelId) {
                customEmojisUrl = await emojis_1.Emojis.singletonSafe()?.channelCustomEmojisUrl(video.channelId);
            }
        }
        catch (err) {
            options.peertubeHelpers.logger.error(err);
            return {
                isError: true,
                code: 500,
                message: 'An error occured'
            };
        }
    }
    return {
        prosodyDomain,
        localAnonymousJID,
        localBoshUri,
        localWsUri,
        remoteConnectionInfos,
        roomJID,
        customEmojisUrl
    };
}
async function _remoteConnectionInfos(remoteChatInfos, canWebsocketS2S, canDirectS2S) {
    if (!remoteChatInfos) {
        throw new Error('Should have remote chat infos for remote videos');
    }
    if (remoteChatInfos.type !== 'xmpp') {
        throw new Error('Should have remote xmpp chat infos for remote videos');
    }
    const connectionInfos = {
        roomJID: remoteChatInfos.jid,
        externalAuthCompatible: false
    };
    if ((0, connection_infos_1.compatibleRemoteAuthenticatedConnectionEnabled)(remoteChatInfos, canWebsocketS2S, canDirectS2S)) {
        connectionInfos.authenticated = true;
    }
    const anonymousCI = (0, connection_infos_1.anonymousConnectionInfos)(remoteChatInfos ?? false);
    if (anonymousCI?.boshUri) {
        connectionInfos.anonymous = {
            userJID: anonymousCI.userJID,
            boshUri: anonymousCI.boshUri,
            wsUri: anonymousCI.wsUri
        };
    }
    if (remoteChatInfos.xmppserver.external) {
        connectionInfos.externalAuthCompatible = true;
    }
    return connectionInfos;
}
async function _localRoomJID(options, settings, prosodyDomain, roomKey, video, channelId, forceType) {
    let room;
    if (forceType) {
        if (/^channel\.\d+$/.test(roomKey)) {
            room = 'channel.{{CHANNEL_ID}}@room.' + prosodyDomain;
        }
        else {
            room = '{{VIDEO_UUID}}@room.' + prosodyDomain;
        }
    }
    else {
        if (settings['prosody-room-type'] === 'channel') {
            room = 'channel.{{CHANNEL_ID}}@room.' + prosodyDomain;
        }
        else {
            room = '{{VIDEO_UUID}}@room.' + prosodyDomain;
        }
    }
    if (room.includes('{{VIDEO_UUID}}')) {
        if (!video) {
            throw new Error('Missing video');
        }
        room = room.replace(/{{VIDEO_UUID}}/g, video.uuid);
    }
    room = room.replace(/{{CHANNEL_ID}}/g, `${channelId}`);
    if (room.includes('{{CHANNEL_NAME}}')) {
        const channelName = await (0, channel_1.getChannelNameById)(options, channelId);
        if (channelName === null) {
            throw new Error('Channel not found');
        }
        if (!/^[a-zA-Z0-9_.]+$/.test(channelName)) {
            options.peertubeHelpers.logger.error(`Invalid channel name, contains unauthorized chars: '${channelName}'`);
            throw new Error('Invalid channel name, contains unauthorized chars');
        }
        room = room.replace(/{{CHANNEL_NAME}}/g, channelName);
    }
    return room;
}
//# sourceMappingURL=params.js.map