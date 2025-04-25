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
exports.LivechatProsodyAuth = void 0;
const domain_1 = require("./config/domain");
const helpers_1 = require("../helpers");
const node_crypto_1 = require("node:crypto");
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
async function getRandomBytes(size) {
    return new Promise((resolve, reject) => {
        (0, node_crypto_1.randomBytes)(size, (err, buf) => {
            if (err)
                return reject(err);
            return resolve(buf);
        });
    });
}
function generatePassword(length) {
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    return Array.from((0, node_crypto_1.randomFillSync)(new Uint32Array(length)))
        .map((x) => characters[x % characters.length])
        .join('');
}
let singleton;
class LivechatProsodyAuth {
    constructor(options, prosodyDomain, userTokensEnabled, secretKey) {
        this._passwords = new Map();
        this._tokensInfoByJID = new Map();
        this._encryptionOptions = {
            algorithm: 'aes256',
            inputEncoding: 'utf8',
            outputEncoding: 'hex'
        };
        this._options = options;
        this._prosodyDomain = prosodyDomain;
        this._userTokensEnabled = userTokensEnabled;
        this._secretKey = secretKey;
        this._tokensPath = path.join(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'tokens');
        this._logger = {
            debug: (s) => options.peertubeHelpers.logger.debug('[LivechatProsodyAuth] ' + s),
            info: (s) => options.peertubeHelpers.logger.info('[LivechatProsodyAuth] ' + s),
            warn: (s) => options.peertubeHelpers.logger.warn('[LivechatProsodyAuth] ' + s),
            error: (s) => options.peertubeHelpers.logger.error('[LivechatProsodyAuth] ' + s)
        };
    }
    async getUserTempPassword(user) {
        const normalizedUsername = this._normalizeUsername(user);
        if (!normalizedUsername) {
            return undefined;
        }
        const password = this._getOrSetTempPassword(normalizedUsername);
        const nickname = await (0, helpers_1.getUserNickname)(this._options, user);
        return {
            jid: normalizedUsername + '@' + this._prosodyDomain,
            password,
            nickname,
            type: 'peertube'
        };
    }
    async userRegistered(normalizedUsername) {
        const entry = this._getAndClean(normalizedUsername);
        if (entry) {
            return true;
        }
        if (this._userTokensEnabled) {
            try {
                const tokensInfo = await this._getTokensInfoForJID(normalizedUsername + '@' + this._prosodyDomain);
                if (!tokensInfo?.tokens.length) {
                    return false;
                }
                if (await this._userIdValid(tokensInfo.userId)) {
                    return true;
                }
            }
            catch (err) {
                this._logger.error(err);
                return false;
            }
        }
        return false;
    }
    async checkUserPassword(normalizedUsername, password) {
        const entry = this._getAndClean(normalizedUsername);
        if (entry && entry.password === password) {
            return true;
        }
        if (this._userTokensEnabled) {
            try {
                const tokensInfo = await this._getTokensInfoForJID(normalizedUsername + '@' + this._prosodyDomain);
                if (!tokensInfo?.tokens.length) {
                    return false;
                }
                if (!await this._userIdValid(tokensInfo.userId)) {
                    return false;
                }
                if (tokensInfo.tokens.find((t) => t.password === password)) {
                    return true;
                }
            }
            catch (err) {
                this._logger.error(err);
                return false;
            }
        }
        return false;
    }
    async getUserTokens(user) {
        if (!this._userTokensEnabled) {
            return undefined;
        }
        if (!user || !user.id) {
            return undefined;
        }
        if (user.blocked) {
            return undefined;
        }
        const normalizedUsername = this._normalizeUsername(user);
        if (!normalizedUsername) {
            return undefined;
        }
        const nickname = await (0, helpers_1.getUserNickname)(this._options, user);
        const jid = normalizedUsername + '@' + this._prosodyDomain;
        const tokensInfo = await this._getTokensInfoForJID(jid);
        if (!tokensInfo) {
            return [];
        }
        if (tokensInfo.userId !== user.id) {
            return undefined;
        }
        const tokens = [];
        for (const token of tokensInfo.tokens) {
            tokens.push(Object.assign({}, token, {
                nickname
            }));
        }
        return tokens;
    }
    setUserTokensEnabled(enabled) {
        this._userTokensEnabled = !!enabled;
        if (!this.userRegistered) {
            this._tokensInfoByJID.clear();
        }
    }
    async createUserToken(user, label) {
        if (!this._userTokensEnabled) {
            return undefined;
        }
        if (!user || !user.id) {
            return undefined;
        }
        if (user.blocked) {
            return undefined;
        }
        const normalizedUsername = this._normalizeUsername(user);
        if (!normalizedUsername) {
            return undefined;
        }
        const nickname = await (0, helpers_1.getUserNickname)(this._options, user);
        const jid = normalizedUsername + '@' + this._prosodyDomain;
        const token = await this._createToken(user.id, jid, label);
        token.nickname = nickname;
        return token;
    }
    async revokeUserToken(user, id) {
        if (!this._userTokensEnabled) {
            return false;
        }
        if (!user || !user.id) {
            return false;
        }
        if (user.blocked) {
            return false;
        }
        const normalizedUsername = this._normalizeUsername(user);
        if (!normalizedUsername) {
            return false;
        }
        const jid = normalizedUsername + '@' + this._prosodyDomain;
        const tokensInfo = await this._getTokensInfoForJID(jid);
        if (!tokensInfo) {
            return true;
        }
        if (tokensInfo.userId !== user.id) {
            return false;
        }
        await this._saveTokens(user.id, jid, tokensInfo.tokens.filter(t => t.id !== id));
        return true;
    }
    _getOrSetTempPassword(normalizedUsername) {
        const entry = this._getAndClean(normalizedUsername);
        const validity = Date.now() + (24 * 60 * 60 * 1000);
        if (entry) {
            entry.validity = validity;
            return entry.password;
        }
        const password = generatePassword(20);
        this._passwords.set(normalizedUsername, {
            password,
            validity
        });
        return password;
    }
    _normalizeUsername(user) {
        if (!user || !user.id) {
            return undefined;
        }
        if (user.blocked) {
            return undefined;
        }
        const normalizedUsername = user.username.toLowerCase();
        return normalizedUsername;
    }
    _getAndClean(normalizedUsername) {
        const entry = this._passwords.get(normalizedUsername);
        if (entry) {
            if (entry.validity > Date.now()) {
                return entry;
            }
            this._passwords.delete(normalizedUsername);
        }
        return undefined;
    }
    async _userIdValid(userId) {
        try {
            const user = await this._options.peertubeHelpers.user.loadById(userId);
            if (!user || user.blocked) {
                return false;
            }
            return true;
        }
        catch (_err) {
            return false;
        }
    }
    _jidTokenPath(jid) {
        if (jid === '.' || jid === '..' || jid.includes('/')) {
            throw new Error('Invalid jid');
        }
        return path.join(this._tokensPath, jid + '.json');
    }
    async _getTokensInfoForJID(jid) {
        try {
            const cached = this._tokensInfoByJID.get(jid);
            if (cached) {
                return cached;
            }
            const filePath = this._jidTokenPath(jid);
            const content = await fs.promises.readFile(filePath);
            const json = JSON.parse(content.toString());
            if ((typeof json !== 'object') || (typeof json.userId !== 'number') || (!Array.isArray(json.tokens))) {
                throw new Error('Invalid token file content');
            }
            const tokens = [];
            for (const entry of json.tokens) {
                const token = {
                    jid,
                    password: await this._decrypt(entry.encryptedPassword),
                    date: entry.date,
                    label: entry.label,
                    id: entry.id
                };
                tokens.push(token);
            }
            const d = {
                userId: json.userId,
                tokens
            };
            this._tokensInfoByJID.set(jid, d);
            return d;
        }
        catch (err) {
            if (('code' in err) && err.code === 'ENOENT') {
                this._tokensInfoByJID.set(jid, undefined);
                return undefined;
            }
            throw err;
        }
    }
    async _createToken(userId, jid, label) {
        const tokensInfo = (await this._getTokensInfoForJID(jid)) ?? { userId, tokens: [] };
        const now = Date.now();
        const id = now;
        if (tokensInfo.tokens.find(t => t.id === id)) {
            throw new Error('There is already a token with this id.');
        }
        const password = generatePassword(30);
        const newToken = {
            id,
            jid,
            date: now,
            password,
            label
        };
        tokensInfo.tokens.push(newToken);
        await this._saveTokens(userId, jid, tokensInfo.tokens);
        return newToken;
    }
    async _saveTokens(userId, jid, tokens) {
        const ti = {
            userId,
            tokens
        };
        this._tokensInfoByJID.set(jid, ti);
        const toSave = {
            userId,
            tokens: []
        };
        for (const t of tokens) {
            toSave.tokens.push({
                id: t.id,
                date: t.date,
                encryptedPassword: await this._encrypt(t.password),
                label: t.label
            });
        }
        const content = JSON.stringify(toSave);
        await fs.promises.mkdir(this._tokensPath, {
            recursive: true
        });
        await fs.promises.writeFile(this._jidTokenPath(jid), content);
    }
    async _encrypt(data) {
        const { algorithm, inputEncoding, outputEncoding } = this._encryptionOptions;
        const iv = await getRandomBytes(16);
        const cipher = (0, node_crypto_1.createCipheriv)(algorithm, this._secretKey, iv);
        let encrypted = cipher.update(data, inputEncoding, outputEncoding);
        encrypted += cipher.final(outputEncoding);
        return iv.toString(outputEncoding) + ':' + encrypted;
    }
    async _decrypt(data) {
        const { algorithm, inputEncoding, outputEncoding } = this._encryptionOptions;
        const encryptedArray = data.split(':');
        const iv = Buffer.from(encryptedArray[0], outputEncoding);
        const encrypted = encryptedArray[1];
        const decipher = (0, node_crypto_1.createDecipheriv)(algorithm, this._secretKey, iv);
        return decipher.update(encrypted, outputEncoding, inputEncoding) + decipher.final(inputEncoding);
    }
    static singleton() {
        if (!singleton) {
            throw new Error('LivechatProsodyAuth singleton not initialized yet');
        }
        return singleton;
    }
    static async initSingleton(options) {
        const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
        let secretKey = await options.storageManager.getData('livechat-prosody-auth-secretkey');
        if (!secretKey) {
            secretKey = (await getRandomBytes(16)).toString('hex');
            await options.storageManager.storeData('livechat-prosody-auth-secretkey', secretKey);
        }
        const userTokenDisabled = await options.settingsManager.getSetting('livechat-token-disabled');
        singleton = new LivechatProsodyAuth(options, prosodyDomain, !userTokenDisabled, secretKey);
        return singleton;
    }
    static async destroySingleton() {
        singleton = undefined;
    }
}
exports.LivechatProsodyAuth = LivechatProsodyAuth;
//# sourceMappingURL=auth.js.map