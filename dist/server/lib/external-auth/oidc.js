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
exports.ExternalAuthOIDC = void 0;
const error_1 = require("./error");
const helpers_1 = require("../helpers");
const canonicalize_1 = require("../uri/canonicalize");
const domain_1 = require("../prosody/config/domain");
const manage_users_1 = require("../prosody/api/manage-users");
const config_1 = require("../prosody/config");
const debug_1 = require("../debug");
const node_crypto_1 = require("node:crypto");
const openid_client_1 = require("openid-client");
const jid_1 = require("@xmpp/jid");
const url_1 = require("url");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const got = require('got');
function getMimeTypeFromArrayBuffer(arrayBuffer) {
    const uint8arr = new Uint8Array(arrayBuffer);
    const len = 4;
    if (uint8arr.length >= len) {
        const signatureArr = new Array(len);
        for (let i = 0; i < len; i++) {
            signatureArr[i] = (new Uint8Array(arrayBuffer))[i].toString(16);
        }
        const signature = signatureArr.join('').toUpperCase();
        switch (signature) {
            case '89504E47':
                return 'image/png';
            case '47494638':
                return 'image/gif';
            case 'FFD8FFDB':
            case 'FFD8FFE0':
                return 'image/jpeg';
            case '52494646':
            case '57454250':
                return 'image/webp';
            default:
                return null;
        }
    }
    return null;
}
let singletons;
async function getRandomBytes(size) {
    return new Promise((resolve, reject) => {
        (0, node_crypto_1.randomBytes)(size, (err, buf) => {
            if (err)
                return reject(err);
            return resolve(buf);
        });
    });
}
class ExternalAuthOIDC {
    constructor(params) {
        this.encryptionOptions = {
            algorithm: 'aes256',
            inputEncoding: 'utf8',
            outputEncoding: 'hex'
        };
        this.cookieNamePrefix = 'peertube-plugin-livechat-oidc-';
        this.cookieOptions = {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
            maxAge: 1000 * 60 * 10
        };
        this.logger = {
            debug: (s) => params.logger.debug('[ExternalAuthOIDC] ' + s),
            info: (s) => params.logger.info('[ExternalAuthOIDC] ' + s),
            warn: (s) => params.logger.warn('[ExternalAuthOIDC] ' + s),
            error: (s) => params.logger.error('[ExternalAuthOIDC] ' + s)
        };
        this.singletonType = params.singletonType;
        this.enabled = !!params.enabled;
        this.secretKey = params.secretKey;
        this.redirectUrl = params.redirectUrl;
        this.connectUrl = params.connectUrl;
        this.externalVirtualhost = params.externalVirtualhost;
        this.avatarsDir = params.avatarsDir;
        this.avatarsFiles = params.avatarsFiles;
        if (this.enabled) {
            this.buttonLabel = params.buttonLabel;
            this.discoveryUrl = params.discoveryUrl;
            this.clientId = params.clientId;
            this.clientSecret = params.clientSecret;
        }
    }
    get type() {
        return this.singletonType;
    }
    isDisabledBySettings() {
        return !this.enabled;
    }
    getConnectUrl() {
        if (!this.client) {
            return null;
        }
        return this.connectUrl;
    }
    getButtonLabel() {
        return this.buttonLabel;
    }
    getDiscoveryUrl() {
        return this.discoveryUrl;
    }
    async isOk(force) {
        if (!force && this.ok !== undefined) {
            return this.ok;
        }
        this.ok = (await this.check()).length === 0;
        return this.ok;
    }
    async check() {
        if (!this.enabled) {
            this.logger.debug('OIDC is disabled');
            return ['OIDC disabled'];
        }
        const errors = [];
        if ((this.buttonLabel ?? '') === '') {
            errors.push('Missing button label');
        }
        if ((this.discoveryUrl ?? '') === '') {
            errors.push('Missing discovery url');
        }
        else {
            try {
                const uri = new url_1.URL(this.discoveryUrl ?? 'wrong url');
                this.logger.debug('OIDC Discovery url is valid: ' + uri.toString());
                this.providerHostName = uri.hostname;
            }
            catch (_err) {
                errors.push('Invalid discovery url');
            }
        }
        if ((this.clientId ?? '') === '') {
            errors.push('Missing client id');
        }
        if ((this.clientSecret ?? '') === '') {
            errors.push('Missing client secret');
        }
        if (errors.length) {
            this.logger.error('OIDC is not ok: ' + JSON.stringify(errors));
        }
        return errors;
    }
    async load() {
        if (this.client !== undefined) {
            return this.client;
        }
        if (!await this.isOk()) {
            this.issuer = null;
            this.client = null;
            return null;
        }
        try {
            this.issuer = await openid_client_1.Issuer.discover(this.discoveryUrl);
            this.logger.debug(`Discovered issuer, metadata are: ${JSON.stringify(this.issuer.metadata)}`);
        }
        catch (err) {
            this.logger.error(err);
            this.issuer = null;
            this.client = null;
        }
        if (!this.issuer) {
            this.client = null;
            return null;
        }
        try {
            this.client = new this.issuer.Client({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uris: [this.redirectUrl],
                response_types: ['code']
            });
        }
        catch (err) {
            this.logger.error(err);
            this.client = null;
        }
        if (!this.client) {
            return null;
        }
        return this.client;
    }
    async initAuthenticationProcess(req, res) {
        if (!this.client) {
            throw new Error('External Auth OIDC not loaded yet, too soon to call oidc.initAuthentication');
        }
        const codeVerifier = openid_client_1.generators.codeVerifier();
        const codeChallenge = openid_client_1.generators.codeChallenge(codeVerifier);
        const state = openid_client_1.generators.state();
        const encryptedCodeVerifier = await this.encrypt(codeVerifier);
        const encryptedState = await this.encrypt(state);
        const redirectUrl = this.client.authorizationUrl({
            scope: 'openid profile',
            response_mode: 'form_post',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state
        });
        res.cookie(this.cookieNamePrefix + 'code-verifier', encryptedCodeVerifier, this.cookieOptions);
        res.cookie(this.cookieNamePrefix + 'state', encryptedState, this.cookieOptions);
        return redirectUrl;
    }
    async validateAuthenticationProcess(req) {
        if (!this.client) {
            throw new Error('External Auth OIDC not loaded yet, too soon to call oidc.validateAuthenticationProcess');
        }
        const encryptedCodeVerifier = req.cookies[this.cookieNamePrefix + 'code-verifier'];
        if (!encryptedCodeVerifier) {
            throw new Error('Received callback but code verifier not found in request cookies.');
        }
        if (typeof encryptedCodeVerifier !== 'string') {
            throw new Error('Invalid code-verifier type.');
        }
        const encryptedState = req.cookies[this.cookieNamePrefix + 'state'];
        if (!encryptedState) {
            throw new Error('Received callback but state not found in request cookies.');
        }
        if (typeof encryptedState !== 'string') {
            throw new Error('Invalid state data type');
        }
        const codeVerifier = await this.decrypt(encryptedCodeVerifier);
        const state = await this.decrypt(encryptedState);
        const params = this.client.callbackParams(req);
        const tokenSet = await this.client.callback(this.redirectUrl, params, {
            code_verifier: codeVerifier,
            state
        });
        const accessToken = tokenSet.access_token;
        if (!accessToken) {
            throw new Error('Missing access_token');
        }
        const userInfo = await this.client.userinfo(accessToken);
        this.logger.debug('User info: ' + JSON.stringify(userInfo));
        if (!userInfo) {
            throw new error_1.ExternalAuthenticationError('Can\'t retrieve userInfos');
        }
        const username = this.readUserInfoField(userInfo, 'username');
        if (username === undefined) {
            throw new error_1.ExternalAuthenticationError('Missing username in userInfos');
        }
        let nickname = this.readUserInfoField(userInfo, 'nickname');
        if (nickname === undefined) {
            const lastname = this.readUserInfoField(userInfo, 'last_name');
            const firstname = this.readUserInfoField(userInfo, 'first_name');
            if (lastname !== undefined && firstname !== undefined) {
                nickname = firstname + ' ' + lastname;
            }
            else if (firstname !== undefined) {
                nickname = firstname;
            }
            else if (lastname !== undefined) {
                nickname = lastname;
            }
        }
        nickname ??= username;
        const jid = this.computeJID(username).toString(false);
        const password = (await getRandomBytes(16)).toString('hex');
        const tokenContent = {
            type: this.type,
            jid,
            password,
            nickname,
            expire: (new Date(Date.now() + 12 * 3600 * 1000))
        };
        const token = this.type + '-' + await this.encrypt(JSON.stringify(tokenContent));
        let avatar = await this.readUserInfoPicture(userInfo);
        if (!avatar) {
            this.logger.debug('No avatar from the external service, getting a random one.');
            avatar = await this.getRandomAvatar();
        }
        return {
            jid,
            nickname,
            password,
            token,
            avatar
        };
    }
    async encrypt(data) {
        const { algorithm, inputEncoding, outputEncoding } = this.encryptionOptions;
        const iv = await getRandomBytes(16);
        const cipher = (0, node_crypto_1.createCipheriv)(algorithm, this.secretKey, iv);
        let encrypted = cipher.update(data, inputEncoding, outputEncoding);
        encrypted += cipher.final(outputEncoding);
        return iv.toString(outputEncoding) + ':' + encrypted;
    }
    async decrypt(data) {
        const { algorithm, inputEncoding, outputEncoding } = this.encryptionOptions;
        const encryptedArray = data.split(':');
        const iv = Buffer.from(encryptedArray[0], outputEncoding);
        const encrypted = encryptedArray[1];
        const decipher = (0, node_crypto_1.createDecipheriv)(algorithm, this.secretKey, iv);
        return decipher.update(encrypted, outputEncoding, inputEncoding) + decipher.final(inputEncoding);
    }
    async unserializeToken(token) {
        try {
            if (!token.startsWith(this.type + '-')) {
                throw new Error('Wrong token prefix');
            }
            token = token.substring(this.type.length + 1);
            const decrypted = await this.decrypt(token);
            const o = JSON.parse(decrypted);
            if (typeof o !== 'object') {
                throw new Error('Invalid encrypted data');
            }
            if (o.type !== this.type) {
                throw new Error('Token type is not the expected one');
            }
            if (typeof o.jid !== 'string' || o.jid === '') {
                throw new Error('No jid');
            }
            if (typeof o.password !== 'string' || o.password === '') {
                throw new Error('No password');
            }
            if (typeof o.nickname !== 'string' || o.nickname === '') {
                throw new Error('No nickname');
            }
            if (typeof o.expire !== 'string' || o.expire === '') {
                throw new Error('Invalid expire data type');
            }
            const expire = new Date(Date.parse(o.expire));
            if (!(expire instanceof Date) || isNaN(expire.getTime())) {
                throw new Error('Invalid expire date');
            }
            if (expire <= new Date()) {
                throw new Error('Token expired');
            }
            return {
                type: o.type,
                jid: o.jid,
                password: o.password,
                nickname: o.nickname,
                expire
            };
        }
        catch (err) {
            this.logger.info('Cant unserialize the token: ' + err);
            return null;
        }
    }
    readUserInfoField(userInfos, normalizedFieldName) {
        const guesses = [normalizedFieldName];
        switch (normalizedFieldName) {
            case 'username':
                guesses.push('sub');
                break;
            case 'last_name':
                guesses.push('family_name');
                break;
            case 'first_name':
                guesses.push('given_name');
                break;
            case 'nickname':
                guesses.push('preferred_username');
                guesses.push('name');
                break;
        }
        for (const field of guesses) {
            if (!(field in userInfos)) {
                continue;
            }
            if (typeof userInfos[field] !== 'string') {
                continue;
            }
            if (userInfos[field] === '') {
                continue;
            }
            return userInfos[field];
        }
        return undefined;
    }
    async readUserInfoPicture(userInfos) {
        const picture = this.readUserInfoField(userInfos, 'picture');
        if (!picture) {
            return undefined;
        }
        try {
            const url = new url_1.URL(picture);
            const buf = await got(url.toString(), {
                method: 'GET',
                headers: {},
                responseType: 'buffer'
            }).buffer();
            const mimeType = getMimeTypeFromArrayBuffer(buf);
            if (!mimeType) {
                throw new Error('Failed to get the avatar file type');
            }
            return {
                mimetype: mimeType,
                base64: buf.toString('base64')
            };
        }
        catch (err) {
            this.logger.error(`Failed to get the user avatar: ${err}`);
            return undefined;
        }
    }
    async getRandomAvatar() {
        try {
            if (!this.avatarsDir || !this.avatarsFiles?.length) {
                return undefined;
            }
            const file = this.avatarsFiles[Math.floor(Math.random() * this.avatarsFiles.length)];
            if (!file) {
                throw new Error('No default avatar file');
            }
            const filePath = path.resolve(this.avatarsDir, file);
            const buf = await fs.promises.readFile(filePath);
            const mimeType = getMimeTypeFromArrayBuffer(buf);
            if (!mimeType) {
                throw new Error('Failed to get the default avatar file type');
            }
            return {
                mimetype: mimeType,
                base64: buf.toString('base64')
            };
        }
        catch (err) {
            this.logger.error(`Failed to get a default avatar: ${err}`);
            return undefined;
        }
    }
    computeJID(username) {
        if (!this.providerHostName) {
            this.logger.error('Missing providerHostName, callong computeJID before check()?');
            throw new Error('Can\'t compute JID');
        }
        try {
            const jid = new jid_1.JID(username + '+' + this.providerHostName, this.externalVirtualhost);
            if (jid.toString(false).length > 256) {
                throw new error_1.ExternalAuthenticationError('Resulting identifier for your account is too long');
            }
            return jid;
        }
        catch (err) {
            this.logger.error(err);
            throw new error_1.ExternalAuthenticationError('Resulting identifier for your account is invalid, please report this issue');
        }
    }
    static async destroySingletons() {
        if (!singletons) {
            return;
        }
        stopPruneTimer();
        const keys = singletons.keys();
        for (const key of keys) {
            const singleton = singletons.get(key);
            if (!singleton) {
                continue;
            }
            singletons.delete(key);
        }
        singletons = undefined;
    }
    static async initSingletons(options) {
        const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
        const prosodyFilePaths = await (0, config_1.getProsodyFilePaths)(options);
        const settings = await options.settingsManager.getSettings([
            'external-auth-custom-oidc',
            'external-auth-custom-oidc-button-label',
            'external-auth-custom-oidc-discovery-url',
            'external-auth-custom-oidc-client-id',
            'external-auth-custom-oidc-client-secret',
            'external-auth-google-oidc',
            'external-auth-google-oidc-client-id',
            'external-auth-google-oidc-client-secret',
            'external-auth-facebook-oidc',
            'external-auth-facebook-oidc-client-id',
            'external-auth-facebook-oidc-client-secret'
        ]);
        const init = async function initSingleton(singletonType, buttonLabel, discoveryUrl) {
            const secretKey = (await getRandomBytes(16)).toString('hex');
            const singleton = new ExternalAuthOIDC({
                logger: options.peertubeHelpers.logger,
                singletonType,
                enabled: settings['external-auth-' + singletonType + '-oidc'],
                buttonLabel,
                discoveryUrl,
                clientId: settings['external-auth-' + singletonType + '-oidc-client-id'],
                clientSecret: settings['external-auth-' + singletonType + '-oidc-client-secret'],
                secretKey,
                connectUrl: ExternalAuthOIDC.connectUrl(options, singletonType),
                redirectUrl: ExternalAuthOIDC.redirectUrl(options, singletonType),
                externalVirtualhost: 'external.' + prosodyDomain,
                avatarsDir: prosodyFilePaths.avatars,
                avatarsFiles: prosodyFilePaths.avatarsFiles
            });
            singletons ??= new Map();
            singletons.set(singletonType, singleton);
        };
        await Promise.all([
            init('custom', settings['external-auth-custom-oidc-button-label'], settings['external-auth-custom-oidc-discovery-url']),
            init('google', 'Google', 'https://accounts.google.com'),
            init('facebook', 'Facebook', 'https://www.facebook.com')
        ]);
        startPruneTimer(options);
    }
    static singleton(singletonType) {
        if (!singletons) {
            throw new Error('ExternalAuthOIDC singletons are not initialized yet');
        }
        const singleton = singletons.get(singletonType);
        if (!singleton) {
            throw new Error(`ExternalAuthOIDC singleton "${singletonType}" is not initiliazed yet`);
        }
        return singleton;
    }
    static allSingletons() {
        if (!singletons) {
            return [];
        }
        return Array.from(singletons.values());
    }
    static singletonForToken(token) {
        try {
            const m = token.match(/^(\w+)-/);
            if (!m) {
                return null;
            }
            return ExternalAuthOIDC.singleton(m[1]);
        }
        catch (_err) {
            return null;
        }
    }
    static connectUrl(options, type) {
        if (!/^\w+$/.test(type)) {
            throw new Error('Invalid singleton type');
        }
        const path = (0, helpers_1.getBaseRouterRoute)(options) + 'oidc/' + type + '/connect';
        return (0, canonicalize_1.canonicalizePluginUri)(options, path, {
            removePluginVersion: true
        });
    }
    static redirectUrl(options, type) {
        if (!/^\w+$/.test(type)) {
            throw new Error('Invalid singleton type');
        }
        const path = (0, helpers_1.getBaseRouterRoute)(options) + 'oidc/' + type + '/cb';
        return (0, canonicalize_1.canonicalizePluginUri)(options, path, {
            removePluginVersion: true
        });
    }
}
exports.ExternalAuthOIDC = ExternalAuthOIDC;
let pruneTimer;
function startPruneTimer(options) {
    stopPruneTimer();
    const logger = {
        debug: (s) => options.peertubeHelpers.logger.debug('[ExternalAuthOIDC startPruneTimer] ' + s),
        info: (s) => options.peertubeHelpers.logger.info('[ExternalAuthOIDC startPruneTimer] ' + s),
        warn: (s) => options.peertubeHelpers.logger.warn('[ExternalAuthOIDC startPruneTimer] ' + s),
        error: (s) => options.peertubeHelpers.logger.error('[ExternalAuthOIDC startPruneTimer] ' + s)
    };
    const pruneInterval = (0, debug_1.debugNumericParameter)(options, 'externalAccountPruneInterval', 60 * 1000, 60 * 60 * 1000);
    logger.info(`Creating a timer for external account pruning, every ${Math.round(pruneInterval / 1000)}s.`);
    pruneTimer = setInterval(async () => {
        try {
            let ok = false;
            for (const oidc of ExternalAuthOIDC.allSingletons()) {
                if (!await oidc.isOk()) {
                    continue;
                }
                ok = true;
                break;
            }
            if (!ok) {
                return;
            }
            logger.info('Pruning external users...');
            await (0, manage_users_1.pruneUsers)(options);
        }
        catch (err) {
            logger.error('Error while pruning external users: ' + err);
        }
    }, pruneInterval);
}
function stopPruneTimer() {
    if (!pruneTimer) {
        return;
    }
    clearInterval(pruneTimer);
    pruneTimer = undefined;
}
//# sourceMappingURL=oidc.js.map