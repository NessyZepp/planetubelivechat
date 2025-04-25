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
exports.updateProsodyChannelEmojisRegex = updateProsodyChannelEmojisRegex;
const manage_rooms_1 = require("../api/manage-rooms");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const emojis_1 = require("../../emojis");
async function updateProsodyChannelEmojisRegex(options) {
    const logger = options.peertubeHelpers.logger;
    const doneFilePath = path.resolve(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'fix-v11.1-emojis');
    if (fs.existsSync(doneFilePath)) {
        logger.debug('[migratev11_1_ChannelEmojis] Channel Emojis Regex already updated on Prosody.');
        return;
    }
    logger.info('[migratev11_1_ChannelEmojis] Updating Channel custom emojis regexp on Prosody');
    const emojis = emojis_1.Emojis.singleton();
    const rooms = await (0, manage_rooms_1.listProsodyRooms)(options);
    logger.debug('[migratev11_1_ChannelEmojis] Found ' + rooms.length.toString() + ' rooms.');
    for (const room of rooms) {
        try {
            let channelId;
            logger.info('[migratev11_1_ChannelEmojis] Must update custom emojis regexp for room ' + room.localpart);
            const matches = room.localpart.match(/^channel\.(\d+)$/);
            if (matches?.[1]) {
                channelId = parseInt(matches[1]);
            }
            else {
                const video = await options.peertubeHelpers.videos.loadByIdOrUUID(room.localpart);
                if (!video || video.remote) {
                    logger.info('[migratev11_1_ChannelEmojis] Video ' + room.localpart + ' not found or remote, skipping');
                    continue;
                }
                channelId = video.channelId;
            }
            if (!channelId) {
                throw new Error('Cant find channelId');
            }
            const regexp = await emojis.getChannelCustomEmojisRegexp(channelId);
            if (regexp === undefined) {
                logger.info('[migratev11_1_ChannelEmojis] Room ' + room.localpart + ' channel has no custom emojis, skipping.');
                continue;
            }
            await (0, manage_rooms_1.updateProsodyRoom)(options, room.jid, {
                livechat_custom_emoji_regexp: regexp
            });
        }
        catch (err) {
            logger.error('[migratev11_1_ChannelEmojis] Failed to handle room ' + room.localpart + ', skipping. Error: ' + err);
            continue;
        }
    }
    await fs.promises.writeFile(doneFilePath, '');
}
//# sourceMappingURL=migrateV12.js.map