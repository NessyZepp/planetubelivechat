"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initConfigurationApiRouter = initConfigurationApiRouter;
const async_1 = require("../../middlewares/async");
const channel_1 = require("../../middlewares/configuration/channel");
const configuration_1 = require("../../middlewares/configuration/configuration");
const storage_1 = require("../../configuration/channel/storage");
const sanitize_1 = require("../../configuration/channel/sanitize");
const params_1 = require("../../../lib/conversejs/params");
const emojis_1 = require("../../../lib/emojis");
const room_channel_1 = require("../../../lib/room-channel");
const manage_rooms_1 = require("../../../lib/prosody/api/manage-rooms");
async function initConfigurationApiRouter(options, router) {
    const logger = options.peertubeHelpers.logger;
    router.get('/configuration/room/:roomKey', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        const roomKey = req.params.roomKey;
        const user = await options.peertubeHelpers.user.getAuthUser(res);
        const initConverseJSParam = await (0, params_1.getConverseJSParams)(options, roomKey, {
            forcetype: req.query.forcetype === '1'
        }, !!user);
        if (('isError' in initConverseJSParam) && initConverseJSParam.isError) {
            res.sendStatus(initConverseJSParam.code);
            return;
        }
        res.status(200);
        res.json(initConverseJSParam);
    }));
    router.get('/configuration/channel/:channelId', (0, async_1.asyncMiddleware)([
        (0, configuration_1.checkConfigurationEnabledMiddleware)(options),
        (0, channel_1.getCheckConfigurationChannelMiddleware)(options),
        async (req, res, _next) => {
            if (!res.locals.channelInfos) {
                logger.error('Missing channelInfos in res.locals, should not happen');
                res.sendStatus(500);
                return;
            }
            const channelInfos = res.locals.channelInfos;
            const channelOptions = await (0, storage_1.getChannelConfigurationOptions)(options, channelInfos.id) ??
                (0, storage_1.getDefaultChannelConfigurationOptions)(options);
            const result = {
                channel: channelInfos,
                configuration: channelOptions
            };
            res.status(200);
            res.json(result);
        }
    ]));
    router.post('/configuration/channel/:channelId', (0, async_1.asyncMiddleware)([
        (0, configuration_1.checkConfigurationEnabledMiddleware)(options),
        (0, channel_1.getCheckConfigurationChannelMiddleware)(options),
        async (req, res, _next) => {
            if (!res.locals.channelInfos) {
                logger.error('Missing channelInfos in res.locals, should not happen');
                res.sendStatus(500);
                return;
            }
            const channelInfos = res.locals.channelInfos;
            logger.debug('Trying to save ChannelConfigurationOptions');
            let channelOptions;
            try {
                if (req.body.bot?.enabled === false) {
                    logger.debug('Bot disabled, loading the previous bot conf to not override hidden fields');
                    const channelOptions = await (0, storage_1.getChannelConfigurationOptions)(options, channelInfos.id) ??
                        (0, storage_1.getDefaultChannelConfigurationOptions)(options);
                    req.body.bot = channelOptions.bot;
                    req.body.bot.enabled = false;
                }
                channelOptions = await (0, sanitize_1.sanitizeChannelConfigurationOptions)(options, channelInfos.id, req.body);
            }
            catch (err) {
                logger.warn(err);
                res.sendStatus(400);
                return;
            }
            logger.debug('Data seems ok, storing them.');
            const result = {
                channel: channelInfos,
                configuration: channelOptions
            };
            await (0, storage_1.storeChannelConfigurationOptions)(options, channelInfos.id, channelOptions);
            res.status(200);
            res.json(result);
        }
    ]));
    router.get('/configuration/channel/emojis/:channelId', (0, async_1.asyncMiddleware)([
        (0, configuration_1.checkConfigurationEnabledMiddleware)(options),
        (0, channel_1.getCheckConfigurationChannelMiddleware)(options),
        async (req, res, _next) => {
            try {
                if (!res.locals.channelInfos) {
                    throw new Error('Missing channelInfos in res.locals, should not happen');
                }
                const emojis = emojis_1.Emojis.singleton();
                const channelInfos = res.locals.channelInfos;
                const channelEmojis = (await emojis.channelCustomEmojisDefinition(channelInfos.id)) ??
                    emojis.emptyChannelDefinition();
                const result = {
                    channel: channelInfos,
                    emojis: channelEmojis
                };
                res.status(200);
                res.json(result);
            }
            catch (err) {
                logger.error(err);
                res.sendStatus(500);
            }
        }
    ]));
    router.post('/configuration/channel/emojis/:channelId', (0, async_1.asyncMiddleware)([
        (0, configuration_1.checkConfigurationEnabledMiddleware)(options),
        (0, channel_1.getCheckConfigurationChannelMiddleware)(options),
        async (req, res, _next) => {
            try {
                if (!res.locals.channelInfos) {
                    throw new Error('Missing channelInfos in res.locals, should not happen');
                }
                const emojis = emojis_1.Emojis.singleton();
                const channelInfos = res.locals.channelInfos;
                const emojisDefinition = req.body;
                let emojisDefinitionSanitized, bufferInfos;
                try {
                    [emojisDefinitionSanitized, bufferInfos] = await emojis.sanitizeChannelDefinition(channelInfos.id, emojisDefinition);
                }
                catch (err) {
                    logger.warn(err);
                    res.sendStatus(400);
                    return;
                }
                await emojis.saveChannelDefinition(channelInfos.id, emojisDefinitionSanitized, bufferInfos);
                const customEmojisRegexp = await emojis.getChannelCustomEmojisRegexp(channelInfos.id);
                const roomJIDs = room_channel_1.RoomChannel.singleton().getChannelRoomJIDs(channelInfos.id);
                for (const roomJID of roomJIDs) {
                    logger.info(`Updating room ${roomJID} emoji only regexp...`);
                    (0, manage_rooms_1.updateProsodyRoom)(options, roomJID, {
                        livechat_custom_emoji_regexp: customEmojisRegexp
                    }).then(() => { }, (err) => logger.error(err));
                }
                const channelEmojis = (await emojis.channelCustomEmojisDefinition(channelInfos.id)) ??
                    emojis.emptyChannelDefinition();
                const result = {
                    channel: channelInfos,
                    emojis: channelEmojis
                };
                res.status(200);
                res.json(result);
            }
            catch (err) {
                logger.error(err);
                res.sendStatus(500);
            }
        }
    ]));
    router.post('/configuration/channel/emojis/:channelId/enable_emoji_only', (0, async_1.asyncMiddleware)([
        (0, configuration_1.checkConfigurationEnabledMiddleware)(options),
        (0, channel_1.getCheckConfigurationChannelMiddleware)(options),
        async (req, res, _next) => {
            try {
                if (!res.locals.channelInfos) {
                    throw new Error('Missing channelInfos in res.locals, should not happen');
                }
                const emojis = emojis_1.Emojis.singleton();
                const channelInfos = res.locals.channelInfos;
                logger.info(`Enabling emoji only mode on each channel ${channelInfos.id} rooms ...`);
                const customEmojisRegexp = await emojis.getChannelCustomEmojisRegexp(channelInfos.id);
                const roomJIDs = room_channel_1.RoomChannel.singleton().getChannelRoomJIDs(channelInfos.id);
                for (const roomJID of roomJIDs) {
                    logger.info(`Enabling emoji only mode on room ${roomJID} ...`);
                    (0, manage_rooms_1.updateProsodyRoom)(options, roomJID, {
                        livechat_emoji_only: true,
                        livechat_custom_emoji_regexp: customEmojisRegexp
                    }).then(() => { }, (err) => logger.error(err));
                }
                res.status(200);
                res.json({ ok: true });
            }
            catch (err) {
                logger.error(err);
                res.sendStatus(500);
            }
        }
    ]));
}
//# sourceMappingURL=configuration.js.map