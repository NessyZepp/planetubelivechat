"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("./lib/migration/settings");
const settings_2 = require("./lib/settings");
const custom_fields_1 = require("./lib/custom-fields");
const index_1 = require("./lib/routers/index");
const init_1 = require("./lib/federation/init");
const init_2 = require("./lib/configuration/channel/init");
const init_3 = require("./lib/rss/init");
const ctl_1 = require("./lib/prosody/ctl");
const debug_1 = require("./lib/debug");
const loc_1 = require("./lib/loc");
const room_channel_1 = require("./lib/room-channel");
const bot_1 = require("./lib/configuration/bot");
const ctl_2 = require("./lib/bots/ctl");
const oidc_1 = require("./lib/external-auth/oidc");
const migrateV10_1 = require("./lib/prosody/migration/migrateV10");
const migrateV12_1 = require("./lib/prosody/migration/migrateV12");
const emojis_1 = require("./lib/emojis");
const auth_1 = require("./lib/prosody/auth");
const decache_1 = __importDefault(require("decache"));
let OPTIONS;
async function register(options) {
    OPTIONS = options;
    const logger = options.peertubeHelpers.logger;
    if (!options.peertubeHelpers.plugin) {
        throw new Error('Your peertube version is not correct. This plugin is not compatible with Peertube < 3.2.0.');
    }
    await (0, loc_1.loadLoc)();
    await bot_1.BotConfiguration.initSingleton(options);
    const roomChannelSingleton = await room_channel_1.RoomChannel.initSingleton(options);
    const roomChannelNeedsDataInit = !await roomChannelSingleton.readData();
    await ctl_2.BotsCtl.initSingleton(options);
    await (0, settings_1.migrateSettings)(options);
    await (0, settings_2.initSettings)(options);
    await emojis_1.Emojis.initSingleton(options);
    await auth_1.LivechatProsodyAuth.initSingleton(options);
    await (0, custom_fields_1.initCustomFields)(options);
    await (0, index_1.initRouters)(options);
    await (0, init_1.initFederation)(options);
    await (0, init_2.initChannelConfiguration)(options);
    await (0, init_3.initRSS)(options);
    try {
        await (0, ctl_1.prepareProsody)(options);
        await (0, ctl_1.ensureProsodyRunning)(options);
        let preBotPromise;
        if (roomChannelNeedsDataInit) {
            logger.info('The RoomChannel singleton has not found any data, we must rebuild');
            preBotPromise = roomChannelSingleton.rebuildData().then(() => { logger.info('RoomChannel singleton rebuild done'); }, (reason) => { logger.error('RoomChannel singleton rebuild failed: ' + reason); });
        }
        else {
            preBotPromise = Promise.resolve();
        }
        preBotPromise.then(async () => {
            await ctl_2.BotsCtl.singleton().start();
        }, () => { });
        preBotPromise.then(() => {
            const p = (0, migrateV10_1.migrateMUCAffiliations)(options).then(() => { }, (err) => {
                logger.error(err);
            });
            p.finally(() => {
                (0, migrateV12_1.updateProsodyChannelEmojisRegex)(options).then(() => { }, (err) => {
                    logger.error(err);
                });
            }).catch(() => { });
        }, () => { });
    }
    catch (error) {
        options.peertubeHelpers.logger.error('Error when launching Prosody: ' + error);
    }
}
async function unregister() {
    try {
        await ctl_2.BotsCtl.destroySingleton();
    }
    catch (_error) { }
    if (OPTIONS) {
        try {
            await (0, ctl_1.ensureProsodyNotRunning)(OPTIONS);
        }
        catch (error) {
            OPTIONS.peertubeHelpers.logger.error('Error when trying to unload Prosody: ' + error);
        }
    }
    (0, debug_1.unloadDebugMode)();
    await room_channel_1.RoomChannel.destroySingleton();
    await bot_1.BotConfiguration.destroySingleton();
    await oidc_1.ExternalAuthOIDC.destroySingletons();
    await emojis_1.Emojis.destroySingleton();
    await auth_1.LivechatProsodyAuth.destroySingleton();
    const module = __filename;
    OPTIONS?.peertubeHelpers.logger.info(`Unloading module ${module}...`);
    (0, decache_1.default)(module);
    OPTIONS?.peertubeHelpers.logger.info(`Successfully unloaded the module ${module}`);
    OPTIONS = undefined;
}
module.exports = {
    register,
    unregister
};
//# sourceMappingURL=main.js.map