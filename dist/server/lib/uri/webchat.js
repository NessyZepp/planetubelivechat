"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBoshUri = getBoshUri;
exports.getWSUri = getWSUri;
exports.getWSS2SUri = getWSS2SUri;
exports.getPublicChatUri = getPublicChatUri;
const helpers_1 = require("../helpers");
const canonicalize_1 = require("./canonicalize");
function getBoshUri(options) {
    return (0, helpers_1.getBaseRouterRoute)(options) + 'http-bind';
}
function getWSUri(options) {
    const base = (0, helpers_1.getBaseWebSocketRoute)(options);
    if (base === undefined) {
        return undefined;
    }
    return base + 'xmpp-websocket';
}
function getWSS2SUri(options) {
    const base = (0, helpers_1.getBaseWebSocketRoute)(options);
    if (base === undefined) {
        return undefined;
    }
    return base + 'xmpp-websocket-s2s';
}
function getPublicChatUri(options, video) {
    const url = (0, helpers_1.getBaseRouterRoute)(options) + 'webchat/room/' + encodeURIComponent(video.uuid);
    return (0, canonicalize_1.canonicalizePluginUri)(options, url, {
        removePluginVersion: true
    });
}
//# sourceMappingURL=webchat.js.map