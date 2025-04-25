"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProsodyConfig = getProsodyConfig;
exports.getWorkingDir = getWorkingDir;
exports.getProsodyFilePaths = getProsodyFilePaths;
exports.writeProsodyConfig = writeProsodyConfig;
exports.getProsodyConfigContentForDiagnostic = getProsodyConfigContentForDiagnostic;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const helpers_1 = require("../helpers");
const content_1 = require("./config/content");
const domain_1 = require("./config/domain");
const apikey_1 = require("../apikey");
const components_1 = require("./config/components");
const storage_1 = require("../federation/storage");
const bot_1 = require("../configuration/bot");
const debug_1 = require("../debug");
const oidc_1 = require("../external-auth/oidc");
const config_1 = require("../firewall/config");
const emojis_1 = require("../emojis");
async function getWorkingDir(options) {
    const peertubeHelpers = options.peertubeHelpers;
    const logger = peertubeHelpers.logger;
    logger.debug('Calling getWorkingDir');
    if (!peertubeHelpers.plugin) {
        throw new Error('Missing peertubeHelpers.plugin, have you the correct Peertube version?');
    }
    const dir = path.resolve(peertubeHelpers.plugin.getDataDirectoryPath(), 'prosody');
    logger.debug('getWorkingDir will return the dir ' + dir);
    return dir;
}
async function getProsodyFilePaths(options) {
    const logger = options.peertubeHelpers.logger;
    logger.debug('Calling getProsodyFilePaths');
    const dir = await getWorkingDir(options);
    const settings = await options.settingsManager.getSettings([
        'use-system-prosody', 'prosody-room-allow-s2s', 'prosody-certificates-dir', 'avatar-set'
    ]);
    let exec;
    let execArgs = [];
    let execCtl;
    let execCtlArgs = [];
    let appImageToExtract;
    const appImageExtractPath = path.resolve(dir, '..', 'prosodyAppImage');
    if (settings['use-system-prosody']) {
        exec = 'prosody';
        execCtl = 'prosodyctl';
    }
    else {
        if (process.arch === 'x64' || process.arch === 'x86_64') {
            logger.debug('Node process.arch is ' + process.arch + ', we will be using the x86_64 Prosody AppImage');
            appImageToExtract = path.resolve(__dirname, '../../prosody/livechat-prosody-x86_64.AppImage');
            exec = path.resolve(appImageExtractPath, 'squashfs-root/AppRun');
            execArgs = ['prosody'];
            execCtl = exec;
            execCtlArgs = ['prosodyctl'];
        }
        else if (process.arch === 'arm64') {
            logger.debug('Node process.arch is ' + process.arch + ', we will be using the aarch64 Prosody AppImage');
            appImageToExtract = path.resolve(__dirname, '../../prosody/livechat-prosody-aarch64.AppImage');
            exec = path.resolve(appImageExtractPath, 'squashfs-root/AppRun');
            execArgs = ['prosody'];
            execCtl = exec;
            execCtlArgs = ['prosodyctl'];
        }
        else {
            logger.info('Node process.arch is ' + process.arch + ', cant use the Prosody AppImage');
        }
    }
    let certsDir = path.resolve(dir, 'certs');
    let certsDirIsCustom = false;
    if (settings['prosody-room-allow-s2s'] && (settings['prosody-certificates-dir'] ?? '') !== '') {
        if (!(await fs.promises.stat(settings['prosody-certificates-dir'])).isDirectory()) {
            logger.error('Certificate directory does not exist or is not a directory');
            certsDir = undefined;
        }
        else {
            certsDir = settings['prosody-certificates-dir'];
        }
        certsDirIsCustom = true;
    }
    else {
        certsDir = path.resolve(dir, 'data');
    }
    let avatarSet = (settings['avatar-set'] ?? 'sepia');
    let avatarsDir;
    let avatarsFiles;
    let botAvatarsDir;
    let botAvatarsFiles;
    if (avatarSet === 'none') {
        botAvatarsDir = path.resolve(__dirname, '../../bot_avatars/', 'sepia');
        botAvatarsFiles = await _listAvatars(botAvatarsDir);
    }
    else {
        if (!['sepia', 'cat', 'bird', 'fenec', 'abstract', 'legacy'].includes(avatarSet)) {
            logger.error('Invalid avatar-set setting, using sepia as default');
            avatarSet = 'sepia';
        }
        avatarsDir = path.resolve(__dirname, '../../avatars/', avatarSet);
        avatarsFiles = await _listAvatars(avatarsDir);
        botAvatarsDir = path.resolve(__dirname, '../../bot_avatars/', avatarSet);
        botAvatarsFiles = await _listAvatars(botAvatarsDir);
    }
    return {
        dir,
        pid: path.resolve(dir, 'prosody.pid'),
        error: path.resolve(dir, 'prosody.err'),
        log: path.resolve(dir, 'prosody.log'),
        config: path.resolve(dir, 'prosody.cfg.lua'),
        data: path.resolve(dir, 'data'),
        certs: certsDir,
        certsDirIsCustom,
        modules: path.resolve(__dirname, '../../prosody-modules'),
        avatars: avatarsDir,
        avatarsFiles,
        botAvatars: botAvatarsDir,
        botAvatarsFiles,
        exec,
        execArgs,
        execCtl,
        execCtlArgs,
        appImageToExtract,
        appImageExtractPath,
        modFirewallFiles: path.resolve(dir, 'mod_firewall_config')
    };
}
async function getProsodyConfig(options) {
    const logger = options.peertubeHelpers.logger;
    logger.debug('Calling getProsodyConfig');
    const settings = await options.settingsManager.getSettings([
        'prosody-port',
        'prosody-muc-log-by-default',
        'prosody-muc-expiration',
        'prosody-c2s',
        'prosody-c2s-port',
        'prosody-c2s-interfaces',
        'prosody-room-allow-s2s',
        'prosody-s2s-port',
        'prosody-s2s-interfaces',
        'prosody-certificates-dir',
        'prosody-room-type',
        'prosody-peertube-uri',
        'prosody-components',
        'prosody-components-port',
        'prosody-components-interfaces',
        'prosody-components-list',
        'chat-no-anonymous',
        'auto-ban-anonymous-ip',
        'federation-dont-publish-remotely',
        'disable-channel-configuration',
        'chat-terms',
        'prosody-firewall-enabled'
    ]);
    const valuesToHideInDiagnostic = new Map();
    const port = settings['prosody-port'] || '52800';
    if (!/^\d+$/.test(port)) {
        throw new Error('Invalid port');
    }
    const logByDefault = settings['prosody-muc-log-by-default'] ?? true;
    const disableAnon = settings['chat-no-anonymous'] || false;
    const autoBanIP = settings['auto-ban-anonymous-ip'] || false;
    const logExpirationSetting = settings['prosody-muc-expiration'] ?? DEFAULTLOGEXPIRATION;
    const enableC2S = settings['prosody-c2s'] || false;
    const enableRoomS2S = settings['prosody-room-allow-s2s'] || false;
    const enableComponents = settings['prosody-components'] || false;
    const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
    const paths = await getProsodyFilePaths(options);
    const roomType = settings['prosody-room-type'] === 'channel' ? 'channel' : 'video';
    const enableRemoteChatConnections = !settings['federation-dont-publish-remotely'];
    let certificates = false;
    const useBots = !settings['disable-channel-configuration'];
    const bots = {};
    const chatTerms = (typeof settings['chat-terms'] === 'string') && settings['chat-terms']
        ? settings['chat-terms']
        : undefined;
    let useExternal = false;
    try {
        const oidcs = oidc_1.ExternalAuthOIDC.allSingletons();
        for (const oidc of oidcs) {
            if (await oidc.isOk()) {
                useExternal = true;
                break;
            }
        }
    }
    catch (err) {
        logger.error(err);
        useExternal = false;
    }
    const useMultiplexing = useBots;
    const apikey = await (0, apikey_1.getAPIKey)(options);
    valuesToHideInDiagnostic.set('APIKey', apikey);
    const publicServerUrl = options.peertubeHelpers.config.getWebserverUrl();
    let basePeertubeUrl = settings['prosody-peertube-uri'];
    if (basePeertubeUrl) {
        logger.debug('basePeertubeUrl for internal API: using the settings value');
        if (!/^https?:\/\/[a-z0-9.-_]+(?::\d+)?$/.test(basePeertubeUrl)) {
            throw new Error('Invalid prosody-peertube-uri');
        }
    }
    if (!basePeertubeUrl && ('getServerListeningConfig' in options.peertubeHelpers.config)) {
        const listeningConfig = options.peertubeHelpers.config.getServerListeningConfig();
        if (listeningConfig?.port) {
            if (!listeningConfig.hostname || listeningConfig.hostname === '::') {
                logger.debug('basePeertubeUrl for internal API: getServerListeningConfig.hostname==="' +
                    (listeningConfig.hostname ?? '') +
                    '", fallbacking on 127.0.0.1.');
                basePeertubeUrl = `http://127.0.0.1:${listeningConfig.port}`;
            }
            else {
                logger.debug('basePeertubeUrl for internal API: using getServerListeningConfig');
                basePeertubeUrl = `http://${listeningConfig.hostname}:${listeningConfig.port}`;
            }
        }
    }
    if (!basePeertubeUrl) {
        logger.debug('basePeertubeUrl for internal API: using public Url');
        basePeertubeUrl = publicServerUrl;
    }
    const baseApiUrl = basePeertubeUrl + (0, helpers_1.getBaseRouterRoute)(options) + 'api/';
    const authApiUrl = baseApiUrl + 'user';
    const roomApiUrl = baseApiUrl + 'room?apikey=' + apikey + '&jid={room.jid|jid_node}';
    const testApiUrl = baseApiUrl + 'test?apikey=' + apikey;
    const config = new content_1.ProsodyConfigContent(paths, prosodyDomain, chatTerms);
    if (!disableAnon) {
        config.useAnonymous(autoBanIP);
    }
    if (useExternal) {
        config.useExternal(apikey);
    }
    config.useHttpAuthentication(authApiUrl);
    const useWS = !!options.registerWebSocketRoute;
    config.usePeertubeBoshAndWebsocket(prosodyDomain, port, publicServerUrl, useWS, useMultiplexing);
    config.useMucHttpDefault(roomApiUrl);
    if (enableC2S) {
        const c2sPort = settings['prosody-c2s-port'] || '52822';
        if (!/^\d+$/.test(c2sPort)) {
            throw new Error('Invalid c2s port');
        }
        const c2sInterfaces = (settings['prosody-c2s-interfaces'] || '127.0.0.1, ::1')
            .split(',')
            .map(s => s.trim());
        c2sInterfaces.forEach(networkInterface => {
            if (networkInterface === '*')
                return;
            if (networkInterface === '::')
                return;
            if (networkInterface.match(/^\d+\.\d+\.\d+\.\d+$/))
                return;
            if (networkInterface.match(/^[a-f0-9:]+$/))
                return;
            throw new Error('Invalid c2s interfaces');
        });
        config.useC2S(c2sPort, c2sInterfaces);
    }
    if (enableComponents) {
        const componentsPort = settings['prosody-components-port'] || '53470';
        if (!/^\d+$/.test(componentsPort)) {
            throw new Error('Invalid external components port');
        }
        const componentsInterfaces = (settings['prosody-components-interfaces'] || '')
            .split(',')
            .map(s => s.trim());
        componentsInterfaces.forEach(networkInterface => {
            if (networkInterface === '*')
                return;
            if (networkInterface === '::')
                return;
            if (networkInterface.match(/^\d+\.\d+\.\d+\.\d+$/))
                return;
            if (networkInterface.match(/^[a-f0-9:]+$/))
                return;
            throw new Error('Invalid components interfaces');
        });
        const components = (0, components_1.parseExternalComponents)(settings['prosody-components-list'] || '', prosodyDomain);
        for (const component of components) {
            valuesToHideInDiagnostic.set('Component ' + component.name + ' secret', component.secret);
        }
        config.useExternalComponents(componentsPort, componentsInterfaces, components);
    }
    if (enableRoomS2S || enableRemoteChatConnections) {
        certificates = 'generate-self-signed';
        if (config.paths.certsDirIsCustom) {
            certificates = 'use-from-dir';
        }
        let s2sPort, s2sInterfaces;
        if (enableRoomS2S) {
            s2sPort = settings['prosody-s2s-port'] || '5269';
            if (!/^\d+$/.test(s2sPort)) {
                throw new Error('Invalid s2s port');
            }
            s2sInterfaces = (settings['prosody-s2s-interfaces'] || '')
                .split(',')
                .map(s => s.trim());
            s2sInterfaces.forEach(networkInterface => {
                if (networkInterface === '*')
                    return;
                if (networkInterface === '::')
                    return;
                if (networkInterface.match(/^\d+\.\d+\.\d+\.\d+$/))
                    return;
                if (networkInterface.match(/^[a-f0-9:]+$/))
                    return;
                throw new Error('Invalid s2s interfaces');
            });
        }
        else {
            s2sPort = null;
            s2sInterfaces = null;
        }
        config.useS2S(s2sPort, s2sInterfaces, publicServerUrl, (0, storage_1.getRemoteServerInfosDir)(options));
    }
    const logExpiration = readLogExpiration(options, logExpirationSetting);
    config.useMam(logByDefault, logExpiration);
    config.useDefaultPersistent();
    config.useManageRoomsApi(apikey);
    config.usePeertubeVCards(basePeertubeUrl);
    if (paths.avatars && paths.avatarsFiles) {
        config.useAnonymousRandomVCards(paths.avatars, paths.avatarsFiles);
    }
    if (useBots) {
        config.useBotsVirtualHost(paths.botAvatars, paths.botAvatarsFiles);
        bots.moderation = await bot_1.BotConfiguration.singleton().getModerationBotGlobalConf();
        if (bots.moderation?.connection?.password && typeof bots.moderation.connection.password === 'string') {
            valuesToHideInDiagnostic.set('BotPassword', bots.moderation.connection.password);
        }
    }
    config.usePoll();
    if (settings['prosody-firewall-enabled'] === true) {
        const modFirewallFiles = await (0, config_1.listModFirewallFiles)(options, paths.modFirewallFiles);
        config.useModFirewall(modFirewallFiles);
    }
    const commonEmojisRegexp = emojis_1.Emojis.singletonSafe()?.getCommonEmojisRegexp();
    if (commonEmojisRegexp) {
        config.useRestrictMessage(commonEmojisRegexp);
    }
    else {
        logger.error('Fail to load common emojis regexp, disabling restrict message module.');
    }
    config.useTestModule(apikey, testApiUrl);
    const debugMucAdminJids = (0, debug_1.debugMucAdmins)(options);
    if (debugMucAdminJids) {
        config.addMucAdmins(debugMucAdminJids);
    }
    let logLevel;
    if (logger.level && (typeof logger.level === 'string')) {
        if (logger.level === 'error' || logger.level === 'info' || logger.level === 'debug') {
            logLevel = logger.level;
        }
        else if (logger.level === 'warn' || logger.level === 'warning') {
            logLevel = 'warn';
        }
    }
    if (logLevel === undefined) {
        logger.info('No log level found in Peertube, will use default "info" for Prosody');
        logLevel = 'info';
    }
    config.setLog(logLevel);
    const content = config.write();
    return {
        content,
        paths,
        port,
        baseApiUrl,
        host: prosodyDomain,
        roomType,
        logByDefault,
        logExpiration,
        valuesToHideInDiagnostic,
        certificates,
        bots
    };
}
async function writeProsodyConfig(options) {
    const logger = options.peertubeHelpers.logger;
    logger.debug('Calling writeProsodyConfig');
    logger.debug('Computing the Prosody config content');
    const config = await getProsodyConfig(options);
    const content = config.content;
    const fileName = config.paths.config;
    logger.info(`Writing prosody configuration file to ${fileName}`);
    await fs.promises.writeFile(fileName, content);
    logger.debug('Prosody configuration file writen');
    return config;
}
const DEFAULTLOGEXPIRATION = '1w';
const DEFAULTLOGEXPIRATIONTYPE = 'period';
function readLogExpiration(options, logExpiration) {
    const logger = options.peertubeHelpers.logger;
    logExpiration = logExpiration?.trim();
    if (logExpiration === 'never') {
        return {
            value: 'never',
            type: 'never'
        };
    }
    if (/^\d+$/.test(logExpiration)) {
        if (logExpiration === '0') {
            logger.error('Invalid prosody-muc-expiration value, cannot be 0.');
            return {
                value: DEFAULTLOGEXPIRATION,
                type: DEFAULTLOGEXPIRATIONTYPE,
                error: '0 is not an acceptable value.'
            };
        }
        return {
            value: logExpiration,
            type: 'seconds',
            seconds: parseInt(logExpiration)
        };
    }
    const matches = logExpiration.match(/^(\d+)([d|w|m|y])$/);
    if (matches) {
        const d = matches[1];
        if (d === '0') {
            logger.error(`Invalid prosody-muc-expiration value, cannot be ${logExpiration}.`);
            return {
                value: DEFAULTLOGEXPIRATION,
                type: DEFAULTLOGEXPIRATIONTYPE,
                error: '0 is not an acceptable value.'
            };
        }
        return {
            value: logExpiration,
            type: 'period'
        };
    }
    logger.error(`Invalid prosody-muc-expiration value '${logExpiration}'.`);
    return {
        value: DEFAULTLOGEXPIRATION,
        type: DEFAULTLOGEXPIRATIONTYPE,
        error: `Invalid value '${logExpiration}'.`
    };
}
function getProsodyConfigContentForDiagnostic(config, content) {
    let r = content ?? config.content;
    for (const [key, value] of config.valuesToHideInDiagnostic.entries()) {
        r = r.split(value).join(`***${key}***`);
    }
    r = r.replace(/^(?:(\s*peertubelivechat_restrict_message_common_emoji_regexp\s*=\s*.{0,10}).*)$/gm, '$1 ***long line truncated***');
    return r;
}
async function _listAvatars(dir) {
    const files = await fs.promises.readdir(dir);
    const r = [];
    for (const file of files) {
        if (!file.endsWith('.jpg') && !file.endsWith('.png')) {
            continue;
        }
        r.push(file);
    }
    return r.sort();
}
//# sourceMappingURL=config.js.map