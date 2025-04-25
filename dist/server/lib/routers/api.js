"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initApiRouter = initApiRouter;
const async_1 = require("../middlewares/async");
const apikey_1 = require("../middlewares/apikey");
const ctl_1 = require("../prosody/ctl");
const debug_1 = require("../debug");
const room_1 = require("./api/room");
const auth_1 = require("./api/auth");
const federation_server_infos_1 = require("./api/federation-server-infos");
const configuration_1 = require("./api/configuration");
const promote_1 = require("./api/promote");
const emojis_1 = require("./emojis");
const firewall_1 = require("./api/admin/firewall");
async function initApiRouter(options) {
    const { peertubeHelpers, getRouter } = options;
    const router = getRouter();
    const logger = peertubeHelpers.logger;
    router.get('/test', (0, async_1.asyncMiddleware)([
        (0, apikey_1.getCheckAPIKeyMiddleware)(options),
        async (req, res, _next) => {
            logger.info('Test api call');
            res.json({ ok: true });
        }
    ]));
    await (0, room_1.initRoomApiRouter)(options, router);
    await (0, auth_1.initAuthApiRouter)(options, router);
    await (0, auth_1.initUserAuthApiRouter)(options, router);
    await (0, federation_server_infos_1.initFederationServerInfosApiRouter)(options, router);
    await (0, configuration_1.initConfigurationApiRouter)(options, router);
    await (0, promote_1.initPromoteApiRouter)(options, router);
    await (0, emojis_1.initEmojisRouter)(options, router);
    await (0, firewall_1.initAdminFirewallApiRouter)(options, router);
    if ((0, debug_1.isDebugMode)(options)) {
        router.get('/restart_prosody', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
            if (!(0, debug_1.isDebugMode)(options)) {
                res.json({ ok: false });
                return;
            }
            const restartProsodyInDebugMode = req.query.debugger === 'true';
            await (0, ctl_1.ensureProsodyRunning)(options, true, restartProsodyInDebugMode);
            res.json({ ok: true });
        }));
    }
    return router;
}
//# sourceMappingURL=api.js.map