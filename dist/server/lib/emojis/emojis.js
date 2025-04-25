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
exports.Emojis = void 0;
const helpers_1 = require("../helpers");
const canonicalize_1 = require("../uri/canonicalize");
const emojis_1 = require("../../../shared/lib/emojis");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
let singleton;
class Emojis {
    constructor(options, commonEmojisCodes) {
        this.channelCache = new Map();
        const logger = options.peertubeHelpers.logger;
        this.options = options;
        this.commonEmojisCodes = commonEmojisCodes;
        this.channelBasePath = path.join(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'emojis', 'channel');
        const baseRouterRoute = (0, helpers_1.getBaseRouterRoute)(options);
        this.channelBaseUri = (0, canonicalize_1.canonicalizePluginUri)(options, baseRouterRoute + 'emojis/channel/', {
            removePluginVersion: true
        });
        this.logger = {
            debug: (s) => logger.debug('[Emojis] ' + s),
            info: (s) => logger.info('[Emojis] ' + s),
            warn: (s) => logger.warn('[Emojis] ' + s),
            error: (s) => logger.error('[Emojis] ' + s)
        };
    }
    async channelHasCustomEmojis(channelId) {
        if (this.channelCache.has(channelId)) {
            return this.channelCache.get(channelId);
        }
        const filepath = this.channelCustomEmojisDefinitionPath(channelId);
        const v = await fs.promises.access(filepath, fs.constants.F_OK).then(() => true, () => false);
        this.channelCache.set(channelId, v);
        return v;
    }
    async channelCustomEmojisUrl(channelId) {
        if (!await this.channelHasCustomEmojis(channelId)) {
            return undefined;
        }
        const route = (0, helpers_1.getBaseRouterRoute)(this.options) +
            'emojis/channel/' +
            encodeURIComponent(channelId) +
            '/definition';
        return (0, canonicalize_1.canonicalizePluginUri)(this.options, route, {
            removePluginVersion: true
        });
    }
    channelCustomEmojisDefinitionPath(channelId) {
        if (typeof channelId !== 'number') {
            throw new Error('Invalid channelId');
        }
        return path.join(this.channelBasePath, channelId.toString(), 'definition.json');
    }
    async channelCustomEmojisDefinition(channelId) {
        const filepath = this.channelCustomEmojisDefinitionPath(channelId);
        let content;
        try {
            content = await fs.promises.readFile(filepath);
        }
        catch (err) {
            if (('code' in err) && err.code === 'ENOENT') {
                return undefined;
            }
            throw err;
        }
        return JSON.parse(content.toString());
    }
    validImageFileName(fileName) {
        const m = fileName.match(/^(?:\d+)\.([a-z]+)$/);
        if (!m) {
            this.logger.debug('Filename invalid: ' + fileName);
            return false;
        }
        const ext = m[1];
        if (!emojis_1.allowedExtensions.includes(ext)) {
            this.logger.debug('File extension non allowed: ' + ext);
            return false;
        }
        return true;
    }
    validShortName(sn) {
        if ((typeof sn !== 'string') || !/^:?[\w-]+:?$/.test(sn)) {
            this.logger.debug('Short name invalid: ' + (typeof sn === 'string' ? sn : '???'));
            return false;
        }
        return true;
    }
    async validFileUrl(channelId, url) {
        if (typeof url !== 'string') {
            this.logger.debug('File url is not a string');
            return false;
        }
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
            this.logger.debug('Url does not start by http scheme');
            return false;
        }
        const fileName = url.split('/').pop() ?? '';
        if (!this.validImageFileName(fileName)) {
            return false;
        }
        const correctUrl = this.channelBaseUri + channelId.toString() + '/files/' + encodeURIComponent(fileName);
        if (url !== correctUrl) {
            this.logger.debug('Url is not the expected url: ' + url + ' vs ' + correctUrl);
            return false;
        }
        return true;
    }
    async validBufferInfos(channelId, toBufInfos) {
        if (toBufInfos.buf.length > emojis_1.maxSize) {
            this.logger.debug('File is too big');
            return false;
        }
        return true;
    }
    async fileDataURLToBufferInfos(channelId, url, cnt) {
        if ((typeof url !== 'string') || !url.startsWith('data:')) {
            return undefined;
        }
        const regex = /^data:(\w+\/([a-z]+));base64,/;
        const m = url.match(regex);
        if (!m) {
            this.logger.debug('Invalid data url format.');
            return undefined;
        }
        const mimetype = m[1];
        if (!emojis_1.allowedMimeTypes.includes(mimetype)) {
            this.logger.debug('Mime type not allowed: ' + mimetype);
        }
        const ext = m[2];
        if (!emojis_1.allowedExtensions.includes(ext)) {
            this.logger.debug('Extension not allowed: ' + ext);
            return undefined;
        }
        const buf = Buffer.from(url.replace(regex, ''), 'base64');
        const filename = Date.now().toString() + cnt.toString() + '.' + ext;
        const newUrl = this.channelBaseUri + channelId.toString() + '/files/' + encodeURIComponent(filename);
        return {
            buf,
            url: newUrl,
            filename
        };
    }
    channelCustomEmojisFilePath(channelId, fileName) {
        if (!this.validImageFileName(fileName)) {
            throw new Error('Invalid filename');
        }
        return path.join(this.channelCustomEmojisDirPath(channelId), fileName);
    }
    channelCustomEmojisDirPath(channelId) {
        if (typeof channelId !== 'number') {
            throw new Error('Invalid channelId');
        }
        return path.join(this.channelBasePath, channelId.toString(), 'files');
    }
    emptyChannelDefinition() {
        return {
            customEmojis: []
        };
    }
    async sanitizeChannelDefinition(channelId, def) {
        if (typeof def !== 'object') {
            throw new Error('Invalid definition, type must be object');
        }
        if (!('customEmojis' in def) || !Array.isArray(def.customEmojis)) {
            throw new Error('Invalid custom emojis entry in definition');
        }
        if (def.customEmojis.length > emojis_1.maxEmojisPerChannel) {
            throw new Error('Too many custom emojis');
        }
        const buffersInfos = [];
        let cnt = 0;
        const customEmojis = [];
        let categoryEmojiFound = false;
        for (const ce of def.customEmojis) {
            cnt++;
            if (typeof ce !== 'object') {
                throw new Error('Invalid custom emoji');
            }
            if (!this.validShortName(ce.sn)) {
                throw new Error('Invalid short name');
            }
            if ((typeof ce.url === 'string') && ce.url.startsWith('data:')) {
                const b = await this.fileDataURLToBufferInfos(channelId, ce.url, cnt);
                if (!b) {
                    throw new Error('Invalid data URL');
                }
                if (!await this.validBufferInfos(channelId, b)) {
                    throw new Error('Invalid file');
                }
                ce.url = b.url;
                buffersInfos.push(b);
            }
            if (!await this.validFileUrl(channelId, ce.url)) {
                throw new Error('Invalid file url');
            }
            const sanitized = {
                sn: ce.sn,
                url: ce.url
            };
            if (ce.isCategoryEmoji === true && !categoryEmojiFound) {
                sanitized.isCategoryEmoji = true;
                categoryEmojiFound = true;
            }
            customEmojis.push(sanitized);
        }
        const result = {
            customEmojis
        };
        return [result, buffersInfos];
    }
    async saveChannelDefinition(channelId, def, bufferInfos) {
        const filepath = this.channelCustomEmojisDefinitionPath(channelId);
        await fs.promises.mkdir(path.dirname(filepath), {
            recursive: true
        });
        await fs.promises.writeFile(filepath, JSON.stringify(def));
        this.channelCache.delete(channelId);
        const fileDirPath = this.channelCustomEmojisDirPath(channelId);
        await fs.promises.mkdir(fileDirPath, {
            recursive: true
        });
        for (const b of bufferInfos) {
            const fp = path.join(fileDirPath, b.filename);
            await fs.promises.writeFile(fp, b.buf);
        }
        const presentFiles = new Map();
        for (const e of def.customEmojis) {
            const fn = e.url.split('/').pop();
            if (fn === undefined) {
                continue;
            }
            presentFiles.set(fn, true);
        }
        const dirents = await fs.promises.readdir(fileDirPath, { withFileTypes: true });
        for (const dirent of dirents) {
            if (!dirent.isFile()) {
                continue;
            }
            if (presentFiles.has(dirent.name)) {
                continue;
            }
            const fp = path.join(fileDirPath, dirent.name);
            this.logger.debug('Deleting obsolete emojis file: ' + fp);
            await fs.promises.unlink(fp);
        }
    }
    async deleteChannelDefinition(channelId) {
        const filepath = this.channelCustomEmojisDefinitionPath(channelId);
        const fileDirPath = this.channelCustomEmojisDirPath(channelId);
        this.logger.info('Deleting all channel ' + channelId.toString() + ' emojis...');
        try {
            await fs.promises.rm(fileDirPath, {
                force: true,
                recursive: true
            });
            await fs.promises.rm(path.dirname(filepath), {
                force: true,
                recursive: true
            });
        }
        catch (err) {
            if (!(('code' in err) && err.code === 'ENOENT')) {
                this.logger.error(err);
            }
        }
        finally {
            this.channelCache.delete(channelId);
        }
    }
    async getChannelCustomEmojisRegexp(channelId) {
        const parts = [];
        if (await this.channelHasCustomEmojis(channelId)) {
            const def = await this.channelCustomEmojisDefinition(channelId);
            if (def) {
                parts.push(...def.customEmojis.map(d => d.sn));
            }
        }
        if (parts.length === 0) {
            return undefined;
        }
        return parts.join('|');
    }
    getCommonEmojisRegexp() {
        return this.commonEmojisCodes.join('|');
    }
    static singleton() {
        if (!singleton) {
            throw new Error('Emojis singleton not initialized yet');
        }
        return singleton;
    }
    static singletonSafe() {
        return singleton;
    }
    static async initSingleton(options) {
        const disabled = await options.settingsManager.getSetting('disable-channel-configuration');
        const commonEmojisCodes = await _getConverseEmojiCodes(options);
        if (disabled) {
            singleton = undefined;
        }
        else {
            singleton = new Emojis(options, commonEmojisCodes);
        }
    }
    static async destroySingleton() {
        if (!singleton) {
            return;
        }
        singleton = undefined;
    }
}
exports.Emojis = Emojis;
async function _getConverseEmojiCodes(options) {
    try {
        const converseEmojiDefPath = path.join(__dirname, '..', '..', '..', 'converse-emoji.json');
        options.peertubeHelpers.logger.debug('Loading Converse Emojis from file ' + converseEmojiDefPath);
        const converseEmojis = JSON.parse((await fs.promises.readFile(converseEmojiDefPath)).toString());
        const r = [];
        for (const [key, block] of Object.entries(converseEmojis)) {
            if (key === 'custom') {
                continue;
            }
            r.push(...Object.values(block)
                .map((d) => d.cp ? _emojiCpToRegexp(d.cp) : d.sn)
                .filter((sn) => sn && sn !== ''));
        }
        return r;
    }
    catch (err) {
        options.peertubeHelpers.logger.error('Failed to load Converse Emojis file, emoji only mode will be buggy. ' + err);
        return [];
    }
}
function _emojiCpToRegexp(unicode) {
    if (unicode.includes('-')) {
        const parts = [];
        const s = unicode.split('-');
        for (let i = 0; i < s.length; i++) {
            parts.push('\\x{' + s[i] + '}');
        }
        return parts.join('');
    }
    return '\\x{' + unicode + '}';
}
//# sourceMappingURL=emojis.js.map