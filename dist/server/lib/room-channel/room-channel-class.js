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
exports.RoomChannel = void 0;
const domain_1 = require("../prosody/config/domain");
const manage_rooms_1 = require("../prosody/api/manage-rooms");
const channel_1 = require("../database/channel");
const storage_1 = require("../configuration/channel/storage");
const bot_1 = require("../configuration/bot");
const custom_fields_1 = require("../custom-fields");
const video_1 = require("../../../shared/lib/video");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let singleton;
class RoomChannel {
    constructor(params) {
        this.room2Channel = new Map();
        this.channel2Rooms = new Map();
        this.needSync = false;
        this.roomConfToUpdate = new Map();
        this.isWriting = false;
        this.options = params.options;
        this.mucDomain = params.mucDomain;
        this.dataFilePath = params.dataFilePath;
        const logger = params.options.peertubeHelpers.logger;
        this.logger = {
            debug: (s) => logger.debug('[RoomChannel] ' + s),
            info: (s) => logger.info('[RoomChannel] ' + s),
            warn: (s) => logger.warn('[RoomChannel] ' + s),
            error: (s) => logger.error('[RoomChannel] ' + s)
        };
    }
    static async initSingleton(options) {
        const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
        const mucDomain = 'room.' + prosodyDomain;
        const dataFilePath = path.resolve(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'room-channel', mucDomain + '.json');
        singleton = new RoomChannel({
            options,
            mucDomain,
            dataFilePath
        });
        return singleton;
    }
    static async destroySingleton() {
        if (!singleton) {
            return;
        }
        singleton.cancelScheduledSync();
        await singleton.sync();
        singleton.cancelScheduledSync();
        singleton = undefined;
    }
    static singleton() {
        if (!singleton) {
            throw new Error('RoomChannel singleton is not initialized yet');
        }
        return singleton;
    }
    async readData() {
        let content;
        try {
            content = (await fs.promises.readFile(this.dataFilePath)).toString();
        }
        catch (_err) {
            this.logger.info('Failed reading room-channel data file (' + this.dataFilePath + '), assuming it does not exists');
            return false;
        }
        content ??= '{}';
        let data;
        try {
            data = JSON.parse(content);
        }
        catch (_err) {
            this.logger.error('Unable to parse the content of the room-channel data file, will start with an empty database.');
            return false;
        }
        return this._readData(data);
    }
    _readData(data) {
        this.room2Channel.clear();
        this.channel2Rooms.clear();
        this.needSync = true;
        if (typeof data !== 'object') {
            this.logger.error('Invalid room-channel data file content');
            return false;
        }
        for (const k in data) {
            if (!/^\d+$/.test(k)) {
                this.logger.error('Invalid channel ID type, should be a number, dropping');
                continue;
            }
            const channelId = parseInt(k);
            const rooms = data[k];
            if (!Array.isArray(rooms)) {
                this.logger.error('Invalid room list for Channel ' + channelId.toString() + ', dropping');
                continue;
            }
            const c2r = new Map();
            this.channel2Rooms.set(channelId, c2r);
            for (const roomJID of rooms) {
                if (typeof roomJID !== 'string') {
                    this.logger.error('Invalid room jid for Channel ' + channelId.toString() + ', dropping');
                    continue;
                }
                c2r.set(roomJID, true);
                this.room2Channel.set(roomJID, channelId);
            }
        }
        return true;
    }
    async rebuildData() {
        const data = {};
        const rooms = await (0, manage_rooms_1.listProsodyRooms)(this.options);
        const settings = await this.options.settingsManager.getSettings([
            'chat-per-live-video',
            'chat-all-lives',
            'chat-all-non-lives',
            'chat-videos-list',
            'prosody-room-type'
        ]);
        for (const room of rooms) {
            let channelId;
            const matches = room.localpart.match(/^channel\.(\d+)$/);
            if (matches?.[1]) {
                if (settings['prosody-room-type'] !== 'channel') {
                    this.logger.debug(`Room ${room.localpart} is a channel-wide room, but prosody-room-type!== channel. Ignoring it`);
                    continue;
                }
                channelId = parseInt(matches[1]);
                if (isNaN(channelId)) {
                    this.logger.error(`Invalid room JID '${room.localpart}'`);
                    continue;
                }
                const channelInfos = await (0, channel_1.getChannelInfosById)(this.options, channelId);
                if (!channelInfos) {
                    this.logger.debug(`Ignoring room ${room.localpart}, because channel ${channelId} seems to not exist anymore`);
                    continue;
                }
            }
            else {
                if (settings['prosody-room-type'] !== 'video') {
                    this.logger.debug(`Room ${room.localpart} is a video-related room, but prosody-room-type!== room. Ignoring it`);
                    continue;
                }
                const uuid = room.localpart;
                const video = await this.options.peertubeHelpers.videos.loadByIdOrUUID(uuid);
                if (!video) {
                    this.logger.debug(`Ignoring room ${room.localpart}, because video ${uuid} seems to not exist anymore`);
                    continue;
                }
                await (0, custom_fields_1.fillVideoCustomFields)(this.options, video);
                const hasChat = (0, video_1.videoHasWebchat)({
                    'chat-per-live-video': !!settings['chat-per-live-video'],
                    'chat-all-lives': !!settings['chat-all-lives'],
                    'chat-all-non-lives': !!settings['chat-all-non-lives'],
                    'chat-videos-list': settings['chat-videos-list']
                }, video);
                if (!hasChat) {
                    this.logger.debug(`Video ${video.uuid} has no chat, ignoring it during the rebuild`);
                    continue;
                }
                channelId = video.channelId;
            }
            if (!channelId) {
                this.logger.error(`Did not find channelId for ${room.localpart}`);
                continue;
            }
            channelId = channelId.toString();
            if (!(channelId in data)) {
                this.logger.debug(`Room ${room.localpart} is associated to channel ${channelId}`);
                data[channelId] = [];
            }
            data[channelId].push(room.localpart);
        }
        for (const roomJID of this.room2Channel.keys()) {
            this.roomConfToUpdate.set(roomJID, true);
        }
        this._readData(data);
        for (const roomJID of this.room2Channel.keys()) {
            this.roomConfToUpdate.set(roomJID, true);
        }
        await this.sync();
    }
    async sync() {
        if (!this.needSync) {
            return;
        }
        if (this.isWriting) {
            this.logger.info('Already writing, scheduling a new sync');
            this.scheduleSync();
            return;
        }
        this.logger.info('Syncing...');
        this.isWriting = true;
        const prosodyRoomUpdates = new Map();
        try {
            const data = this._serializeData();
            this.needSync = false;
            await fs.promises.mkdir(path.dirname(this.dataFilePath), { recursive: true });
            await fs.promises.writeFile(this.dataFilePath, JSON.stringify(data));
            this.logger.debug('room-channel sync done, must sync room conf now');
            const channelConfigurationOptionsCache = new Map();
            const roomJIDs = Array.from(this.roomConfToUpdate.keys());
            for (const roomJID of roomJIDs) {
                const channelId = this.room2Channel.get(roomJID);
                if (channelId === undefined) {
                    this.logger.info(`Room ${roomJID} has no associated channel, ensuring there is no active bot conf`);
                    await bot_1.BotConfiguration.singleton().disableRoom(roomJID);
                    this.roomConfToUpdate.delete(roomJID);
                    continue;
                }
                if (!channelConfigurationOptionsCache.has(channelId)) {
                    try {
                        channelConfigurationOptionsCache.set(channelId, await (0, storage_1.getChannelConfigurationOptions)(this.options, channelId));
                    }
                    catch (err) {
                        this.logger.error(err);
                        this.logger.error('Failed reading channel configuration, will assume there is none.');
                        channelConfigurationOptionsCache.set(channelId, null);
                    }
                }
                const channelConfigurationOptions = channelConfigurationOptionsCache.get(channelId);
                if (!channelConfigurationOptions) {
                    this.logger.info(`Room ${roomJID} has not associated channel options, ensuring there is no active bot conf`);
                    await bot_1.BotConfiguration.singleton().disableRoom(roomJID);
                    this.roomConfToUpdate.delete(roomJID);
                    continue;
                }
                this.logger.info(`Room ${roomJID} has associated channel options, writing it`);
                const previousRoomConf = await bot_1.BotConfiguration.singleton().getRoom(roomJID);
                const botConf = Object.assign({
                    local: roomJID,
                    domain: this.mucDomain
                }, (0, storage_1.channelConfigurationOptionsToBotRoomConf)(this.options, channelConfigurationOptions, previousRoomConf));
                await bot_1.BotConfiguration.singleton().updateRoom(roomJID, botConf);
                prosodyRoomUpdates.set(roomJID, {
                    livechat_muc_terms: channelConfigurationOptions.terms ?? ''
                });
                this.roomConfToUpdate.delete(roomJID);
            }
            this.logger.info('Syncing done.');
        }
        catch (err) {
            this.logger.error(err);
            this.logger.error('Syncing failed.');
            this.needSync = true;
        }
        finally {
            this.isWriting = false;
        }
        if (prosodyRoomUpdates.size) {
            setTimeout(async () => {
                this.logger.info('Syncing done, but still some data to send to Prosody');
                for (const [roomJID, data] of prosodyRoomUpdates.entries()) {
                    try {
                        await (0, manage_rooms_1.updateProsodyRoom)(this.options, roomJID, data);
                    }
                    catch (err) {
                        this.logger.error(`Failed updating prosody room info: "${err}".`);
                    }
                }
            }, 0);
        }
    }
    scheduleSync() {
        if (!this.needSync) {
            return;
        }
        if (this.syncTimeout) {
            this.logger.debug('There is already a sync scheduled, skipping.');
            return;
        }
        this.logger.info('Scheduling a new sync...');
        this.syncTimeout = setTimeout(() => {
            this.syncTimeout = undefined;
            this.logger.info('Running scheduled sync');
            this.sync().then(() => { }, (err) => {
                this.logger.error(err);
            });
        }, 100);
    }
    cancelScheduledSync() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
    }
    link(channelId, roomJIDParam) {
        channelId = parseInt(channelId.toString());
        if (isNaN(channelId)) {
            this.logger.error('Invalid channelId, we wont link');
            return;
        }
        const roomJID = this._canonicJID(roomJIDParam);
        if (!roomJID) {
            this.logger.error('Invalid room JID, we wont link');
            return;
        }
        const previousChannelId = this.room2Channel.get(roomJID);
        if (previousChannelId) {
            if (this.room2Channel.delete(roomJID)) {
                this.needSync = true;
                this.roomConfToUpdate.set(roomJID, true);
            }
            const previousRooms = this.channel2Rooms.get(previousChannelId);
            if (previousRooms) {
                if (previousRooms.delete(roomJID)) {
                    this.needSync = true;
                    this.roomConfToUpdate.set(roomJID, true);
                }
            }
        }
        if (this.room2Channel.get(roomJID) !== channelId) {
            this.room2Channel.set(roomJID, channelId);
            this.needSync = true;
            this.roomConfToUpdate.set(roomJID, true);
        }
        let rooms = this.channel2Rooms.get(channelId);
        if (!rooms) {
            rooms = new Map();
            this.channel2Rooms.set(channelId, rooms);
            this.needSync = true;
        }
        if (!rooms.has(roomJID)) {
            rooms.set(roomJID, true);
            this.needSync = true;
            this.roomConfToUpdate.set(roomJID, true);
        }
        this.scheduleSync();
    }
    removeRoom(roomJIDParam) {
        const roomJID = this._canonicJID(roomJIDParam);
        if (!roomJID) {
            this.logger.error('Invalid room JID, we wont link');
            return;
        }
        const channelId = this.room2Channel.get(roomJID);
        if (channelId) {
            const rooms = this.channel2Rooms.get(channelId);
            if (rooms) {
                if (rooms.delete(roomJID)) {
                    this.needSync = true;
                    this.roomConfToUpdate.set(roomJID, true);
                }
            }
        }
        if (this.room2Channel.delete(roomJID)) {
            this.needSync = true;
            this.roomConfToUpdate.set(roomJID, true);
        }
        this.scheduleSync();
    }
    removeChannel(channelId) {
        channelId = parseInt(channelId.toString());
        if (isNaN(channelId)) {
            this.logger.error('Invalid channelId, we wont remove');
            return;
        }
        const rooms = this.channel2Rooms.get(channelId);
        if (rooms) {
            for (const roomJID of rooms.keys()) {
                if (this.room2Channel.get(roomJID) === channelId) {
                    this.room2Channel.delete(roomJID);
                    this.needSync = true;
                    this.roomConfToUpdate.set(roomJID, true);
                }
            }
        }
        if (this.channel2Rooms.delete(channelId)) {
            this.needSync = true;
        }
        this.scheduleSync();
    }
    getRoomChannelId(roomJIDParam) {
        const roomJID = this._canonicJID(roomJIDParam);
        if (!roomJID) {
            this.logger.error('Invalid room JID: ' + roomJIDParam);
            return null;
        }
        return this.room2Channel.get(roomJID) ?? null;
    }
    getChannelRoomJIDs(channelId) {
        channelId = parseInt(channelId.toString());
        if (isNaN(channelId)) {
            this.logger.error('Invalid channelId, we wont link');
            return [];
        }
        const rooms = this.channel2Rooms.get(channelId);
        if (!rooms) {
            return [];
        }
        return Array.from(rooms.keys());
    }
    refreshChannelConfigurationOptions(channelId) {
        channelId = parseInt(channelId.toString());
        if (isNaN(channelId)) {
            this.logger.error('Invalid channelId, we wont link');
            return;
        }
        const roomJIDs = this.getChannelRoomJIDs(channelId);
        this.needSync = true;
        for (const roomJID of roomJIDs) {
            this.roomConfToUpdate.set(roomJID, true);
        }
        this.scheduleSync();
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
    _serializeData() {
        const data = {};
        this.channel2Rooms.forEach((rooms, channelId) => {
            const a = [];
            rooms.forEach((_val, roomJID) => {
                a.push(roomJID);
            });
            data[channelId.toString()] = a;
        });
        return data;
    }
}
exports.RoomChannel = RoomChannel;
//# sourceMappingURL=room-channel-class.js.map