"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizePeertubeLiveChatInfos = sanitizePeertubeLiveChatInfos;
exports.sanitizePeertubeLiveChatServerInfos = sanitizePeertubeLiveChatServerInfos;
exports.sanitizeXMPPHost = sanitizeXMPPHost;
exports.sanitizeXMPPHostFromInstanceUrl = sanitizeXMPPHostFromInstanceUrl;
const url_1 = require("url");
function sanitizePeertubeLiveChatInfos(options, chatInfos, referenceUrl) {
    if (chatInfos === false) {
        return false;
    }
    if (typeof chatInfos !== 'object') {
        return false;
    }
    if (chatInfos.type !== 'xmpp') {
        return false;
    }
    if ((typeof chatInfos.jid) !== 'string') {
        return false;
    }
    if (!('xmppserver' in chatInfos)) {
        return _sanitizePeertubeLiveChatInfosV0(options, chatInfos, referenceUrl);
    }
    if (!chatInfos.xmppserver || (typeof chatInfos.xmppserver !== 'object')) {
        return false;
    }
    const xmppserver = sanitizePeertubeLiveChatServerInfos(options, chatInfos.xmppserver, referenceUrl);
    if (!xmppserver) {
        return false;
    }
    let customEmojisUrl;
    if (('customEmojisUrl' in chatInfos) && chatInfos.customEmojisUrl) {
        customEmojisUrl = sanitizeCustomEmojisUrl(options, chatInfos.customEmojisUrl, referenceUrl);
    }
    const r = {
        type: chatInfos.type,
        jid: chatInfos.jid,
        xmppserver,
        customEmojisUrl
    };
    return r;
}
function sanitizePeertubeLiveChatServerInfos(options, xmppserver, referenceUrl) {
    if (!xmppserver || (typeof xmppserver !== 'object')) {
        return false;
    }
    let checkHost;
    if (referenceUrl) {
        checkHost = _readReferenceUrl(referenceUrl);
        if (!checkHost) {
            options.peertubeHelpers.logger.error('sanitizePeertubeLiveChatServerInfos: got an invalid referenceUrl: ' + referenceUrl);
            return false;
        }
    }
    if ((typeof xmppserver.host) !== 'string') {
        return false;
    }
    const host = _validateHost(xmppserver.host, checkHost);
    if (!host) {
        return false;
    }
    if ((typeof xmppserver.muc) !== 'string') {
        return false;
    }
    const muc = _validateHost(xmppserver.muc, checkHost);
    if (!muc) {
        return false;
    }
    const r = {
        host,
        muc
    };
    const external = _validateHost(xmppserver.external, checkHost);
    if (external) {
        r.external = external;
    }
    if (xmppserver.directs2s) {
        if ((typeof xmppserver.directs2s) === 'object') {
            const port = xmppserver.directs2s.port;
            if ((typeof port === 'string') && /^\d+$/.test(port)) {
                r.directs2s = {
                    port
                };
            }
        }
    }
    if (xmppserver.websockets2s) {
        if ((typeof xmppserver.websockets2s) === 'object') {
            const url = xmppserver.websockets2s.url;
            if ((typeof url === 'string') && _validUrl(url, {
                noSearchParams: true,
                protocol: 'ws.',
                domain: checkHost
            })) {
                r.websockets2s = {
                    url
                };
            }
        }
    }
    if (xmppserver.anonymous) {
        const virtualhost = _validateHost(xmppserver.anonymous.virtualhost, checkHost);
        if (virtualhost) {
            r.anonymous = {
                virtualhost
            };
            const bosh = xmppserver.anonymous.bosh;
            if ((typeof bosh === 'string') && _validUrl(bosh, {
                noSearchParams: true,
                protocol: 'http.',
                domain: checkHost
            })) {
                r.anonymous.bosh = bosh;
            }
            const websocket = xmppserver.anonymous.websocket;
            if ((typeof websocket === 'string') && _validUrl(websocket, {
                noSearchParams: true,
                protocol: 'ws.',
                domain: checkHost
            })) {
                r.anonymous.websocket = websocket;
            }
        }
    }
    return r;
}
function sanitizeCustomEmojisUrl(options, customEmojisUrl, referenceUrl) {
    let checkHost;
    if (referenceUrl) {
        checkHost = _readReferenceUrl(referenceUrl);
        if (!checkHost) {
            options.peertubeHelpers.logger.error('sanitizeCustomEmojisUrl: got an invalid referenceUrl: ' + referenceUrl);
            return undefined;
        }
    }
    if ((typeof customEmojisUrl) !== 'string') {
        return undefined;
    }
    if (!_validUrl(customEmojisUrl, {
        noSearchParams: true,
        protocol: 'http.',
        domain: checkHost
    })) {
        return undefined;
    }
    return customEmojisUrl;
}
function _validUrl(s, constraints) {
    if (typeof s !== 'string') {
        return false;
    }
    if (s === '') {
        return false;
    }
    let url;
    try {
        url = new url_1.URL(s);
    }
    catch (_err) {
        return false;
    }
    if (constraints.protocol) {
        if (constraints.protocol === 'http.') {
            if (url.protocol !== 'https:' && url.protocol !== 'http:') {
                return false;
            }
        }
        else if (constraints.protocol === 'ws.') {
            if (url.protocol !== 'wss:' && url.protocol !== 'ws:') {
                return false;
            }
        }
    }
    if (constraints.noSearchParams) {
        if (url.search !== '') {
            return false;
        }
    }
    if (constraints.domain) {
        if (url.hostname !== constraints.domain) {
            return false;
        }
    }
    return true;
}
function _validateHost(s, mustBeSubDomainOf) {
    try {
        if (typeof s !== 'string') {
            return false;
        }
        if (s.includes('/')) {
            return false;
        }
        const url = new url_1.URL('http://' + s);
        const hostname = url.hostname;
        if (mustBeSubDomainOf && hostname !== mustBeSubDomainOf) {
            const parts = hostname.split('.');
            if (parts.length <= 2) {
                return false;
            }
            parts.shift();
            if (parts.join('.') !== mustBeSubDomainOf) {
                return false;
            }
        }
        return hostname;
    }
    catch (_err) {
        return false;
    }
}
function _readReferenceUrl(s) {
    try {
        if (typeof s !== 'string') {
            return undefined;
        }
        if (!s.startsWith('https://') && !s.startsWith('http://')) {
            s = 'http://' + s;
        }
        const url = new url_1.URL(s);
        const host = url.hostname;
        if (!host.includes('.')) {
            return undefined;
        }
        return host;
    }
    catch (_err) {
        return undefined;
    }
}
function _sanitizePeertubeLiveChatInfosV0(options, chatInfos, referenceUrl) {
    const logger = options.peertubeHelpers.logger;
    logger.debug('We are have to migrate data from the old JSONLD format');
    if (chatInfos === false) {
        return false;
    }
    if (!_assertObjectType(chatInfos)) {
        return false;
    }
    if (chatInfos.type !== 'xmpp') {
        return false;
    }
    if (typeof chatInfos.jid !== 'string') {
        return false;
    }
    if (!Array.isArray(chatInfos.links)) {
        return false;
    }
    let checkHost;
    if (referenceUrl) {
        checkHost = _readReferenceUrl(referenceUrl);
        if (!checkHost) {
            options.peertubeHelpers.logger.error('_sanitizePeertubeLiveChatInfosV0: got an invalid referenceUrl: ' + referenceUrl);
            return false;
        }
    }
    const muc = _validateHost(chatInfos.jid.split('@')[1], checkHost);
    if (!muc) {
        return false;
    }
    if (!muc.startsWith('room.')) {
        logger.error('We expected old format host to begin with "room.". Discarding.');
        return false;
    }
    const host = _validateHost(muc.replace(/^room\./, ''), checkHost);
    if (!host) {
        return false;
    }
    const r = {
        type: chatInfos.type,
        jid: chatInfos.jid,
        xmppserver: {
            host,
            muc
        }
    };
    for (const link of chatInfos.links) {
        if (!_assertObjectType(link) || (typeof link.type !== 'string')) {
            continue;
        }
        if (['xmpp-bosh-anonymous', 'xmpp-websocket-anonymous'].includes(link.type)) {
            if (typeof link.jid !== 'string') {
                continue;
            }
            if (typeof link.url !== 'string') {
                continue;
            }
            if (!_validUrl(link.url, {
                noSearchParams: true,
                protocol: link.type === 'xmpp-websocket-anonymous' ? 'ws.' : 'http.',
                domain: checkHost
            })) {
                continue;
            }
            if (!r.xmppserver.anonymous) {
                r.xmppserver.anonymous = {
                    virtualhost: link.jid
                };
            }
            if (link.type === 'xmpp-bosh-anonymous') {
                r.xmppserver.anonymous.bosh = link.url;
            }
            else if (link.type === 'xmpp-websocket-anonymous') {
                r.xmppserver.anonymous.websocket = link.url;
            }
        }
    }
    return r;
}
function sanitizeXMPPHost(options, host) {
    return _validateHost(host);
}
function sanitizeXMPPHostFromInstanceUrl(_options, s) {
    try {
        if (typeof s !== 'string') {
            return false;
        }
        const url = new url_1.URL(s);
        return url.hostname;
    }
    catch (_err) {
        return false;
    }
}
function _assertObjectType(data) {
    return !!data && (typeof data === 'object') && Object.keys(data).every(k => typeof k === 'string');
}
//# sourceMappingURL=sanitize.js.map