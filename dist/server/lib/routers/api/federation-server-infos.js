"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFederationServerInfosApiRouter = initFederationServerInfosApiRouter;
const async_1 = require("../../middlewares/async");
const outgoing_1 = require("../../federation/outgoing");
async function initFederationServerInfosApiRouter(options, router) {
    const logger = options.peertubeHelpers.logger;
    router.get('/federation_server_infos', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        logger.info('federation_server_infos api call');
        const result = await (0, outgoing_1.serverBuildInfos)(options);
        res.json(result);
    }));
}
//# sourceMappingURL=federation-server-infos.js.map