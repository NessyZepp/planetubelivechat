"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoHasWebchat = videoHasWebchat;
exports.videoHasRemoteWebchat = videoHasRemoteWebchat;
const config_1 = require("./config");
function videoHasWebchat(settings, video) {
    if ('isLocal' in video) {
        if (!video.isLocal)
            return false;
    }
    else {
        if (video.remote)
            return false;
    }
    if (settings['chat-per-live-video'] && video.isLive && video.pluginData?.['livechat-active']) {
        return true;
    }
    if (settings['chat-all-lives']) {
        if (video.isLive)
            return true;
    }
    if (settings['chat-all-non-lives']) {
        if (!video.isLive)
            return true;
    }
    const uuids = (0, config_1.parseConfigUUIDs)(settings['chat-videos-list']);
    if (uuids.includes(video.uuid)) {
        return true;
    }
    return false;
}
function videoHasRemoteWebchat(settings, video) {
    if (settings['federation-no-remote-chat']) {
        return false;
    }
    if ('isLocal' in video) {
        if (video.isLocal)
            return false;
    }
    else {
        if (!video.remote)
            return false;
    }
    if (!video.pluginData) {
        return false;
    }
    if (!video.pluginData['livechat-remote']) {
        return false;
    }
    return true;
}
//# sourceMappingURL=video.js.map