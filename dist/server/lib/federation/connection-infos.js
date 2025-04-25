"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anonymousConnectionInfos = anonymousConnectionInfos;
exports.remoteAuthenticatedConnectionEnabled = remoteAuthenticatedConnectionEnabled;
exports.compatibleRemoteAuthenticatedConnectionEnabled = compatibleRemoteAuthenticatedConnectionEnabled;
function anonymousConnectionInfos(livechatInfos) {
    if (!livechatInfos) {
        return null;
    }
    if (livechatInfos.type !== 'xmpp') {
        return null;
    }
    if (!livechatInfos.xmppserver) {
        return null;
    }
    if (!livechatInfos.xmppserver.anonymous) {
        return null;
    }
    const r = {
        roomJID: livechatInfos.jid,
        userJID: livechatInfos.xmppserver.anonymous.virtualhost
    };
    if (livechatInfos.xmppserver.anonymous.bosh) {
        r.boshUri = livechatInfos.xmppserver.anonymous.bosh;
    }
    if (livechatInfos.xmppserver.anonymous.websocket) {
        r.wsUri = livechatInfos.xmppserver.anonymous.websocket;
    }
    if (!r.boshUri && !r.wsUri) {
        return null;
    }
    return r;
}
function remoteAuthenticatedConnectionEnabled(livechatInfos) {
    if (!livechatInfos) {
        return false;
    }
    if (livechatInfos.type !== 'xmpp') {
        return false;
    }
    if (!('xmppserver' in livechatInfos)) {
        return false;
    }
    if (!livechatInfos.xmppserver) {
        return false;
    }
    if (livechatInfos.xmppserver.websockets2s) {
        return true;
    }
    if (livechatInfos.xmppserver.directs2s) {
        return true;
    }
    return false;
}
function compatibleRemoteAuthenticatedConnectionEnabled(livechatInfos, canWebsocketS2S, canDirectS2S) {
    if (!livechatInfos) {
        return false;
    }
    if (livechatInfos.type !== 'xmpp') {
        return false;
    }
    if (!('xmppserver' in livechatInfos)) {
        return false;
    }
    if (!livechatInfos.xmppserver) {
        return false;
    }
    if (canWebsocketS2S && livechatInfos.xmppserver.websockets2s) {
        return true;
    }
    if (canDirectS2S && livechatInfos.xmppserver.directs2s) {
        return true;
    }
    return false;
}
//# sourceMappingURL=connection-infos.js.map