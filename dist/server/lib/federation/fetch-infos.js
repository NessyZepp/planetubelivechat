"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMissingRemoteServerInfos = fetchMissingRemoteServerInfos;
const storage_1 = require("./storage");
const helpers_1 = require("../helpers");
const canonicalize_1 = require("../uri/canonicalize");
const sanitize_1 = require("./sanitize");
const debug_1 = require("../debug");
const url_1 = require("url");
const got = require('got');
async function fetchMissingRemoteServerInfos(options, remoteInstanceUrl) {
    const logger = options.peertubeHelpers.logger;
    logger.debug(`remoteServerInfos: checking if we have remote server infos for host ${remoteInstanceUrl}.`);
    const maxAge = (0, debug_1.debugNumericParameter)(options, 'remoteServerInfosMaxAge', 3600000, 3600 * 1000 * 24);
    if (await (0, storage_1.hasRemoteServerInfos)(options, remoteInstanceUrl, maxAge)) {
        return;
    }
    let url;
    try {
        const u = new url_1.URL(remoteInstanceUrl);
        u.pathname = (0, helpers_1.getBaseRouterRoute)(options) + 'api/federation_server_infos';
        url = (0, canonicalize_1.canonicalizePluginUri)(options, u.toString(), {
            protocol: 'http',
            removePluginVersion: true
        });
    }
    catch (_err) {
        logger.info('remoteServerInfos: Invalid remote instance url provided: ' + remoteInstanceUrl);
        return;
    }
    try {
        logger.debug('remoteServerInfos: We must check remote server infos using url: ' + url);
        const response = await got(url, {
            method: 'GET',
            headers: {},
            responseType: 'json'
        }).json();
        if (!response) {
            logger.info('remoteServerInfos: Invalid remote server options');
            return;
        }
        const serverInfos = (0, sanitize_1.sanitizePeertubeLiveChatServerInfos)(options, response, remoteInstanceUrl);
        if (serverInfos) {
            await (0, storage_1.storeRemoteServerInfos)(options, serverInfos);
        }
    }
    catch (_err) {
        logger.info('remoteServerInfos: Can\'t get remote instance informations using url ' + url);
    }
}
//# sourceMappingURL=fetch-infos.js.map