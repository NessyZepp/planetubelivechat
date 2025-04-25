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
exports.storeVideoLiveChatInfos = storeVideoLiveChatInfos;
exports.storeRemoteServerInfos = storeRemoteServerInfos;
exports.hasRemoteServerInfos = hasRemoteServerInfos;
exports.getVideoLiveChatInfos = getVideoLiveChatInfos;
exports.getRemoteServerInfosDir = getRemoteServerInfosDir;
const sanitize_1 = require("./sanitize");
const url_1 = require("url");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cache = new Map();
async function storeVideoLiveChatInfos(options, video, liveChatInfos) {
    const logger = options.peertubeHelpers.logger;
    cache.delete(video.url);
    const remote = video.remote;
    const filePath = await _getFilePath(options, remote, video.uuid, video.url);
    if (!filePath) {
        logger.error('Cant compute the file path for storing liveChat infos for video ' + video.uuid);
        return;
    }
    logger.debug(`Video ${video.uuid} data should be stored in ${filePath}`);
    if (!liveChatInfos) {
        logger.debug(`${remote ? 'Remote' : 'Local'} video ${video.uuid} has no chat infos, removing if necessary`);
        await _del(options, filePath);
        cache.delete(video.url);
        return;
    }
    logger.debug(`${remote ? 'Remote' : 'Local'} video ${video.uuid} has chat infos to store`);
    await _store(options, filePath, liveChatInfos);
    cache.delete(video.url);
}
async function getVideoLiveChatInfos(options, video) {
    const logger = options.peertubeHelpers.logger;
    const cached = cache.get(video.url);
    if (cached !== undefined) {
        return cached;
    }
    const remote = ('remote' in video) ? video.remote : !video.isLocal;
    const filePath = await _getFilePath(options, remote, video.uuid, video.url);
    if (!filePath) {
        logger.error('Cant compute the file path for storing liveChat infos for video ' + video.uuid);
        cache.set(video.url, false);
        return false;
    }
    const content = await _get(options, filePath);
    if (content === null) {
        cache.set(video.url, false);
        return false;
    }
    const r = (0, sanitize_1.sanitizePeertubeLiveChatInfos)(options, content);
    cache.set(video.url, r);
    return r;
}
async function storeRemoteServerInfos(options, xmppserver) {
    const logger = options.peertubeHelpers.logger;
    const mainHost = xmppserver.host;
    const hosts = [
        xmppserver.host,
        xmppserver.muc,
        xmppserver.external
    ];
    for (const host of hosts) {
        if (!host) {
            continue;
        }
        if (host.includes('..')) {
            logger.error(`Host seems not correct, contains ..: ${host}`);
            continue;
        }
        const dir = path.resolve(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'serverInfos', host);
        const s2sFilePath = path.resolve(dir, 's2s');
        const wsS2SFilePath = path.resolve(dir, 'ws-s2s');
        const timestampFilePath = path.resolve(dir, 'last-update');
        if (xmppserver.directs2s?.port) {
            await _store(options, s2sFilePath, {
                host: mainHost,
                port: xmppserver.directs2s.port
            });
        }
        else {
            await _del(options, s2sFilePath);
        }
        if (xmppserver.websockets2s?.url) {
            await _store(options, wsS2SFilePath, {
                host: mainHost,
                url: xmppserver.websockets2s.url
            });
        }
        else {
            await _del(options, wsS2SFilePath);
        }
        await _store(options, timestampFilePath, {
            timestamp: (new Date()).getTime()
        });
    }
}
async function hasRemoteServerInfos(options, hostParam, maxAge) {
    const host = (0, sanitize_1.sanitizeXMPPHostFromInstanceUrl)(options, hostParam);
    if (!host) {
        return false;
    }
    if (host.includes('..')) {
        options.peertubeHelpers.logger.error(`Host seems not correct, contains ..: ${host}`);
        return false;
    }
    const filePath = path.resolve(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'serverInfos', host, 'last-update');
    if (!fs.existsSync(filePath)) {
        return false;
    }
    if (maxAge === undefined) {
        return true;
    }
    try {
        const content = await fs.promises.readFile(filePath, {
            encoding: 'utf-8'
        });
        const json = JSON.parse(content);
        if (!json) {
            return false;
        }
        if (typeof json !== 'object') {
            return false;
        }
        if (!json.timestamp) {
            return false;
        }
        if ((typeof json.timestamp) !== 'number') {
            return false;
        }
        const now = (new Date()).getTime();
        if (now - json.timestamp > maxAge) {
            options.peertubeHelpers.logger.info(`Remote informations for server ${host} are outdated.`);
            return false;
        }
    }
    catch (err) {
        options.peertubeHelpers.logger.error('Failed reading the last-update file:', err);
        return false;
    }
    return true;
}
async function _getFilePath(options, remote, uuid, videoUrl) {
    const logger = options.peertubeHelpers.logger;
    try {
        if (!/^(\w|-)+$/.test(uuid)) {
            logger.error(`Video uuid seems not correct: ${uuid}`);
            return null;
        }
        let subFolders;
        if (remote) {
            const u = new url_1.URL(videoUrl);
            const host = u.hostname;
            if (host.includes('..')) {
                logger.error(`Video host seems not correct, contains ..: ${host}`);
                return null;
            }
            subFolders = ['remote', host];
        }
        else {
            subFolders = ['local'];
        }
        return path.resolve(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'videoInfos', ...subFolders, uuid + '.json');
    }
    catch (err) {
        logger.error(err);
        return null;
    }
}
async function _del(options, filePath) {
    const logger = options.peertubeHelpers.logger;
    try {
        if (!fs.existsSync(filePath)) {
            return;
        }
        logger.info('Deleting file ' + filePath);
        fs.rmSync(filePath);
    }
    catch (err) {
        logger.error(err);
    }
}
async function _store(options, filePath, content) {
    const logger = options.peertubeHelpers.logger;
    try {
        const jsonContent = JSON.stringify(content);
        if (!fs.existsSync(filePath)) {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
        else {
            try {
                const currentJSONContent = await fs.promises.readFile(filePath, {
                    encoding: 'utf-8'
                });
                if (currentJSONContent === jsonContent) {
                    return;
                }
            }
            catch (_err) { }
        }
        await fs.promises.writeFile(filePath, jsonContent, {
            encoding: 'utf-8'
        });
    }
    catch (err) {
        logger.error(err);
    }
}
async function _get(options, filePath) {
    const logger = options.peertubeHelpers.logger;
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = await fs.promises.readFile(filePath, {
            encoding: 'utf-8'
        });
        return JSON.parse(content);
    }
    catch (err) {
        logger.error(err);
        return null;
    }
}
function getRemoteServerInfosDir(options) {
    return path.resolve(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'serverInfos');
}
//# sourceMappingURL=storage.js.map