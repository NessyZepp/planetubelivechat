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
exports.unloadDebugMode = unloadDebugMode;
exports.isDebugMode = isDebugMode;
exports.prosodyDebuggerOptions = prosodyDebuggerOptions;
exports.disableLuaUnboundIfNeeded = disableLuaUnboundIfNeeded;
exports.debugNumericParameter = debugNumericParameter;
exports.debugMucAdmins = debugMucAdmins;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let debugContent = null;
function _readDebugFile(options) {
    if (debugContent !== null) {
        return debugContent;
    }
    const peertubeHelpers = options.peertubeHelpers;
    const logger = peertubeHelpers.logger;
    if (!peertubeHelpers.plugin) {
        return false;
    }
    const filepath = path.resolve(peertubeHelpers.plugin.getDataDirectoryPath(), 'debug_mode');
    logger.debug('Testing debug mode by testing if file exists: ' + filepath);
    if (!fs.existsSync(filepath)) {
        debugContent = false;
        return false;
    }
    logger.info('Plugin livechat Debug mode is on.');
    debugContent = {};
    try {
        const content = fs.readFileSync(filepath).toString();
        let json = !content ? {} : JSON.parse(content);
        if (!json || (typeof json !== 'object')) {
            json = {};
        }
        debugContent.prosodyDebuggerOptions = _getProsodyDebuggerOptions(options, json);
        debugContent.logRotateCheckInterval = _getNumericOptions(options, json, 'log_rotate_check_interval');
        debugContent.logRotateEvery = _getNumericOptions(options, json, 'log_rotate_every');
        debugContent.renewCertCheckInterval = _getNumericOptions(options, json, 'renew_cert_check_interval');
        debugContent.renewSelfSignedCertInterval = _getNumericOptions(options, json, 'renew_self_signed_cert_interval');
        debugContent.useOpenSSL = json.use_openssl === true;
        debugContent.remoteServerInfosMaxAge = _getNumericOptions(options, json, 'remote_server_infos_max_age');
        debugContent.alwaysPublishXMPPRoom = json.always_publish_xmpp_room === true;
        debugContent.enablePodcastChatTagForNonLive = json.enable_podcast_chat_tag_for_nonlive === true;
        debugContent.mucAdmins = _getJIDs(options, json, 'muc_admins');
        debugContent.externalAccountPruneInterval = _getNumericOptions(options, json, 'external_account_prune_interval');
    }
    catch (err) {
        logger.error('Failed to read the debug_mode file content:', err);
    }
    return debugContent;
}
function _getProsodyDebuggerOptions(options, json) {
    if (!json) {
        return undefined;
    }
    if (typeof json !== 'object') {
        return undefined;
    }
    if (!json.debug_prosody) {
        return undefined;
    }
    if (typeof json.debug_prosody !== 'object') {
        return undefined;
    }
    if (!json.debug_prosody.debugger_path) {
        return undefined;
    }
    if (typeof json.debug_prosody.debugger_path !== 'string') {
        return undefined;
    }
    const mobdebugPath = json.debug_prosody.debugger_path;
    if (!fs.statSync(mobdebugPath).isDirectory()) {
        options.peertubeHelpers.logger.error('There should be a debugger, but cant find it. Path should be: ', mobdebugPath);
        return undefined;
    }
    const mobdebugHost = json.debug_prosody.host?.toString() || 'localhost';
    const mobdebugPort = json.debug_prosody.port?.toString() || '8172';
    return {
        mobdebugPath,
        mobdebugHost,
        mobdebugPort
    };
}
function _getNumericOptions(options, json, name) {
    if (!(name in json)) {
        return undefined;
    }
    const v = json[name];
    if (typeof v !== 'number') {
        return undefined;
    }
    return json[name];
}
function _getJIDs(options, json, name) {
    if (!(name in json)) {
        return undefined;
    }
    const v = json[name];
    if (!Array.isArray(v)) {
        return undefined;
    }
    return v.filter(jid => {
        if (typeof jid !== 'string') {
            return false;
        }
        if (!/^[a-zA-Z0-9_.-]+(?:@[a-zA-Z0-9_.-]+)?$/.test(jid)) {
            return false;
        }
        return true;
    });
}
function unloadDebugMode() {
    debugContent = null;
}
function isDebugMode(options, feature) {
    const debugContent = _readDebugFile(options);
    if (!debugContent) {
        return false;
    }
    if (!feature) {
        return true;
    }
    return debugContent[feature] === true;
}
function prosodyDebuggerOptions(options) {
    if (process.env.NODE_ENV !== 'dev') {
        return false;
    }
    const debugContent = _readDebugFile(options);
    if (debugContent === false) {
        return false;
    }
    if (!debugContent.prosodyDebuggerOptions) {
        return false;
    }
    return debugContent.prosodyDebuggerOptions;
}
function disableLuaUnboundIfNeeded(options, squashfsPath) {
    const peertubeHelpers = options.peertubeHelpers;
    const logger = peertubeHelpers.logger;
    if (!peertubeHelpers.plugin) {
        return;
    }
    const filepath = path.resolve(peertubeHelpers.plugin.getDataDirectoryPath(), 'no_lua_unbound');
    logger.debug('Testing if file exists: ' + filepath);
    if (!fs.existsSync(filepath)) {
        return;
    }
    logger.info('Must disable lua-unbound.');
    try {
        for (const luaVersion of ['5.1', '5.2', '5.3', '5.4']) {
            const fp = path.resolve(squashfsPath, 'squashfs-root/usr/lib/x86_64-linux-gnu/lua/', luaVersion, 'lunbound.so');
            if (fs.existsSync(fp)) {
                fs.rmSync(fp);
            }
        }
    }
    catch (err) {
        logger.error(err);
    }
}
function debugNumericParameter(options, name, defaultDebug, defaultValue) {
    const debugContent = _readDebugFile(options);
    if (!debugContent) {
        return defaultValue;
    }
    if (name in debugContent) {
        const v = debugContent[name];
        if (typeof v === 'number') {
            return v;
        }
    }
    return defaultDebug;
}
function debugMucAdmins(options) {
    const debugContent = _readDebugFile(options);
    if (!debugContent) {
        return undefined;
    }
    return debugContent.mucAdmins;
}
//# sourceMappingURL=debug.js.map