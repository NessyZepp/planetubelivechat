"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUser = ensureUser;
exports.pruneUsers = pruneUsers;
const host_1 = require("./host");
const domain_1 = require("../config/domain");
const apikey_1 = require("../../apikey");
const got = require('got');
async function ensureUser(options, infos) {
    const logger = options.peertubeHelpers.logger;
    const currentProsody = (0, host_1.getCurrentProsody)();
    if (!currentProsody) {
        throw new Error('It seems that prosody is not binded... Cant call API.');
    }
    const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
    logger.info('Calling ensureUser for ' + infos.jid);
    const apiUrl = `http://localhost:${currentProsody.port}/` +
        'peertubelivechat_manage_users/' +
        `external.${prosodyDomain}/` +
        'ensure-user';
    const apiData = {
        jid: infos.jid,
        nickname: infos.nickname,
        password: infos.password,
        avatar: infos.avatar
    };
    try {
        logger.debug('Calling ensure-user API on url: ' + apiUrl);
        const result = await got(apiUrl, {
            method: 'POST',
            headers: {
                authorization: 'Bearer ' + await (0, apikey_1.getAPIKey)(options),
                host: currentProsody.host
            },
            json: apiData,
            responseType: 'json',
            resolveBodyOnly: true
        });
        logger.debug('ensure-user API response: ' + JSON.stringify(result));
        if (result.result !== 'ok') {
            logger.error('ensure-user API has failed: ' + JSON.stringify(result));
            return false;
        }
    }
    catch (err) {
        logger.error(`ensure-user failed: ' ${err}`);
        return false;
    }
    return true;
}
async function pruneUsers(options) {
    const logger = options.peertubeHelpers.logger;
    const currentProsody = (0, host_1.getCurrentProsody)();
    if (!currentProsody) {
        throw new Error('It seems that prosody is not binded... Cant call API.');
    }
    const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
    logger.info('Calling pruneUsers');
    const apiUrl = `http://localhost:${currentProsody.port}/` +
        'peertubelivechat_manage_users/' +
        `external.${prosodyDomain}/` +
        'prune-users';
    try {
        logger.debug('Calling prune-users API on url: ' + apiUrl);
        await got(apiUrl, {
            method: 'POST',
            headers: {
                authorization: 'Bearer ' + await (0, apikey_1.getAPIKey)(options),
                host: currentProsody.host
            },
            json: {},
            responseType: 'json',
            resolveBodyOnly: true
        });
    }
    catch (err) {
        logger.error(`prune-users failed: ' ${err}`);
    }
}
//# sourceMappingURL=manage-users.js.map