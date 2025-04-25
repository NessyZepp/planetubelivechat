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
exports.BotConfiguration = void 0;
const domain_1 = require("../prosody/config/domain");
const debug_1 = require("../debug");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let singleton;
class BotConfiguration {
    constructor(params) {
        this.roomConfCache = new Map();
        this.options = params.options;
        this.mucDomain = params.mucDomain;
        this.botsDomain = params.botsDomain;
        this.confDir = params.confDir;
        this.roomConfDir = params.roomConfDir;
        this.moderationBotGlobalConf = params.moderationBotGlobalConf;
        const logger = params.options.peertubeHelpers.logger;
        this.logger = {
            debug: (s) => logger.debug('[BotConfiguration] ' + s),
            info: (s) => logger.info('[BotConfiguration] ' + s),
            warn: (s) => logger.warn('[BotConfiguration] ' + s),
            error: (s) => logger.error('[BotConfiguration] ' + s)
        };
    }
    static async initSingleton(options) {
        const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
        const mucDomain = 'room.' + prosodyDomain;
        const botsDomain = 'bot.' + prosodyDomain;
        const confDir = path.resolve(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'bot', mucDomain);
        const roomConfDir = path.resolve(confDir, 'rooms');
        const moderationBotGlobalConf = path.resolve(confDir, 'moderation.json');
        await fs.promises.mkdir(confDir, { recursive: true });
        await fs.promises.mkdir(roomConfDir, { recursive: true });
        singleton = new BotConfiguration({
            options,
            mucDomain,
            botsDomain,
            confDir,
            roomConfDir,
            moderationBotGlobalConf
        });
        return singleton;
    }
    static singleton() {
        if (!singleton) {
            throw new Error('BotConfiguration singleton not initialized yet');
        }
        return singleton;
    }
    async getRoom(roomJIDParam) {
        const roomJID = this._canonicJID(roomJIDParam);
        if (!roomJID) {
            this.logger.error('Invalid room JID');
            return null;
        }
        const conf = await this._getRoomConf(roomJID);
        return conf;
    }
    async updateRoom(roomJIDParam, conf) {
        const roomJID = this._canonicJID(roomJIDParam);
        if (!roomJID) {
            this.logger.error('Invalid room JID');
            return;
        }
        const roomConf = Object.assign({
            local: roomJID,
            domain: this.mucDomain
        }, conf);
        if (!(roomConf.enabled ?? true)) {
            const current = await this._getRoomConf(roomJID);
            if (!current) {
                this.logger.debug(`Bot is disabled for room ${roomJID}, and room has not current conf, skipping`);
                return;
            }
        }
        this.logger.debug(`Setting and writing a new conf for room ${roomJID}`);
        this.roomConfCache.set(roomJID, roomConf);
        await this._writeRoomConf(roomJID);
    }
    async disableRoom(roomJIDParam) {
        const roomJID = this._canonicJID(roomJIDParam);
        if (!roomJID) {
            this.logger.error('Invalid room JID');
            return;
        }
        const conf = await this._getRoomConf(roomJID);
        if (!conf) {
            return;
        }
        conf.enabled = false;
        await this._writeRoomConf(roomJID);
    }
    async getModerationBotGlobalConf(forceRefresh) {
        let config;
        if (!forceRefresh) {
            try {
                const content = (await fs.promises.readFile(this.moderationBotGlobalConf, {
                    encoding: 'utf-8'
                })).toString();
                config = JSON.parse(content);
            }
            catch (_err) {
                this.logger.info('Error reading the moderation bot global configuration file, assuming it does not exists.');
                config = undefined;
            }
        }
        if (!config) {
            const portSetting = await this.options.settingsManager.getSetting('prosody-port');
            const port = portSetting || '52800';
            config = {
                type: 'client',
                connection: {
                    username: 'moderator',
                    password: Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12),
                    domain: this.botsDomain,
                    service: 'xmpp://localhost:' + port
                },
                name: 'Sepia',
                logger: 'ConsoleLogger',
                log_level: (0, debug_1.isDebugMode)(this.options) ? 'debug' : 'info'
            };
            await fs.promises.writeFile(this.moderationBotGlobalConf, JSON.stringify(config), {
                encoding: 'utf-8'
            });
        }
        return config;
    }
    configurationPaths() {
        return {
            moderation: {
                globalFile: this.moderationBotGlobalConf,
                globalDir: this.confDir,
                roomConfDir: this.roomConfDir
            }
        };
    }
    moderationBotJID() {
        return 'moderator@' + this.botsDomain;
    }
    static async destroySingleton() {
        if (!singleton) {
            return;
        }
        singleton = undefined;
    }
    async _getRoomConf(roomJID) {
        const cached = this.roomConfCache.get(roomJID);
        if (cached !== undefined) {
            return cached;
        }
        const filePath = path.resolve(this.roomConfDir, roomJID + '.json');
        let content;
        try {
            content = (await fs.promises.readFile(filePath, {
                encoding: 'utf-8'
            })).toString();
        }
        catch (_err) {
            this.logger.debug('Failed to read room conf file, assuming it does not exists');
            this.roomConfCache.set(roomJID, null);
            return null;
        }
        let json;
        try {
            json = JSON.parse(content);
        }
        catch (_err) {
            this.logger.error(`Error parsing JSON file ${filePath}, assuming empty`);
            this.roomConfCache.set(roomJID, null);
            return null;
        }
        this.roomConfCache.set(roomJID, json);
        return json;
    }
    async _writeRoomConf(roomJID) {
        const conf = this.roomConfCache.get(roomJID);
        if (!conf) {
            throw new Error(`No conf for room ${roomJID}, cant write it`);
        }
        const filePath = path.resolve(this.roomConfDir, roomJID + '.json');
        await fs.promises.writeFile(filePath, JSON.stringify(conf), {
            encoding: 'utf-8'
        });
    }
    _canonicJID(roomJID) {
        const splits = roomJID.split('@');
        if (splits.length < 2) {
            return roomJID;
        }
        if (splits.length > 2) {
            this.logger.error('The room JID contains multiple @, not valid');
            return null;
        }
        if (splits[1] !== this.mucDomain) {
            this.logger.error('The room JID is not on the correct domain');
            return null;
        }
        return splits[0];
    }
}
exports.BotConfiguration = BotConfiguration;
//# sourceMappingURL=bot.js.map