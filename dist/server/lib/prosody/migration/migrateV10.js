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
exports.migrateMUCAffiliations = migrateMUCAffiliations;
const manage_rooms_1 = require("../api/manage-rooms");
const affiliations_1 = require("../config/affiliations");
const domain_1 = require("../config/domain");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
async function migrateMUCAffiliations(options) {
    const logger = options.peertubeHelpers.logger;
    const doneFilePath = path.resolve(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'fix-v10-affiliations');
    if (fs.existsSync(doneFilePath)) {
        logger.debug('[migratev10MUCAffiliations] MUC affiliations for v10 already migrated.');
        return;
    }
    logger.info('[migratev10MUCAffiliations] Migrating MUC affiliations for livechat v10...');
    const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
    const rooms = await (0, manage_rooms_1.listProsodyRooms)(options);
    logger.debug('[migratev10MUCAffiliations] Found ' + rooms.length.toString() + ' rooms.');
    logger.debug('[migratev10MUCAffiliations] loading peertube admins and moderators...');
    const peertubeAff = await _getPeertubeAdminsAndModerators(options, prosodyDomain);
    for (const room of rooms) {
        try {
            let affiliations;
            logger.info('[migratev10MUCAffiliations] Must migrate affiliations for room ' + room.localpart);
            const matches = room.localpart.match(/^channel\.(\d+)$/);
            if (matches?.[1]) {
                const channelId = parseInt(matches[1]);
                if (isNaN(channelId)) {
                    throw new Error('Invalid channelId ' + room.localpart);
                }
                affiliations = await (0, affiliations_1.getChannelAffiliations)(options, channelId);
            }
            else {
                const video = await options.peertubeHelpers.videos.loadByIdOrUUID(room.localpart);
                if (!video || video.remote) {
                    logger.info('[migratev10MUCAffiliations] Video ' + room.localpart + ' not found or remote, skipping');
                    continue;
                }
                affiliations = await (0, affiliations_1.getVideoAffiliations)(options, video);
            }
            const affiliationsToRemove = [];
            for (const jid in peertubeAff) {
                if (jid in affiliations) {
                    continue;
                }
                affiliationsToRemove.push(jid);
            }
            logger.debug('[migratev10MUCAffiliations] Room ' + room.localpart + ', affiliations to set: ' + JSON.stringify(affiliations));
            logger.debug('[migratev10MUCAffiliations] Room ' +
                room.localpart + ', affilations to remove: ' + JSON.stringify(affiliationsToRemove));
            await (0, manage_rooms_1.updateProsodyRoom)(options, room.jid, {
                addAffiliations: affiliations,
                removeAffiliationsFor: affiliationsToRemove
            });
        }
        catch (err) {
            logger.error('[migratev10MUCAffiliations] Failed to handle room ' + room.localpart + ', skipping. Error: ' + err);
            continue;
        }
    }
    await fs.promises.writeFile(doneFilePath, '');
}
async function _getPeertubeAdminsAndModerators(options, prosodyDomain) {
    const [results] = await options.peertubeHelpers.database.query('SELECT "username" FROM "user"' +
        ' WHERE "user"."role" IN (0, 1)');
    if (!Array.isArray(results)) {
        throw new Error('_getPeertubeAdminsAndModerators: query result is not an array.');
    }
    const r = {};
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (typeof result !== 'object') {
            throw new Error('_getPeertubeAdminsAndModerators: query result is not an object');
        }
        if (!('username' in result)) {
            throw new Error('_getPeertubeAdminsAndModerators: no username field in result');
        }
        const jid = result.username + '@' + prosodyDomain;
        r[jid] = 'member';
    }
    return r;
}
//# sourceMappingURL=migrateV10.js.map