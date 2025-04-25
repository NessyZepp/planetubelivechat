"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAdminFirewallApiRouter = initAdminFirewallApiRouter;
const async_1 = require("../../../middlewares/async");
const is_admin_1 = require("../../../middlewares/is-admin");
const config_1 = require("../../../firewall/config");
const config_2 = require("../../../prosody/config");
const ctl_1 = require("../../../prosody/ctl");
function canEditFirewallConfigMiddleware(options) {
    return async (req, res, next) => {
        if (!await (0, config_1.canEditFirewallConfig)(options)) {
            options.peertubeHelpers.logger.info('Firewall configuration editing is disabled');
            res.sendStatus(403);
            return;
        }
        next();
    };
}
async function initAdminFirewallApiRouter(options, router) {
    const logger = options.peertubeHelpers.logger;
    router.get('/admin/firewall', (0, async_1.asyncMiddleware)([
        (0, is_admin_1.checkUserIsAdminMiddleware)(options),
        canEditFirewallConfigMiddleware(options),
        async (req, res, _next) => {
            try {
                const prosodyPaths = await (0, config_2.getProsodyFilePaths)(options);
                const result = await (0, config_1.getModFirewallConfig)(options, prosodyPaths.modFirewallFiles);
                res.status(200);
                res.json(result);
            }
            catch (err) {
                options.peertubeHelpers.logger.error(err);
                res.sendStatus(500);
            }
        }
    ]));
    router.post('/admin/firewall', (0, async_1.asyncMiddleware)([
        (0, is_admin_1.checkUserIsAdminMiddleware)(options),
        canEditFirewallConfigMiddleware(options),
        async (req, res, _next) => {
            try {
                const prosodyPaths = await (0, config_2.getProsodyFilePaths)(options);
                let data;
                try {
                    data = await (0, config_1.sanitizeModFirewallConfig)(options, req.body);
                }
                catch (err) {
                    logger.error(err);
                    res.sendStatus(400);
                    return;
                }
                await (0, config_1.saveModFirewallConfig)(options, prosodyPaths.modFirewallFiles, data);
                logger.info('Just saved a new mod_firewall const, must rewrite Prosody configuration file, and reload Prosody.');
                await (0, config_2.writeProsodyConfig)(options);
                await (0, ctl_1.reloadProsody)(options);
                const result = await (0, config_1.getModFirewallConfig)(options, prosodyPaths.modFirewallFiles);
                res.status(200);
                res.json(result);
            }
            catch (err) {
                options.peertubeHelpers.logger.error(err);
                res.sendStatus(500);
            }
        }
    ]));
}
//# sourceMappingURL=firewall.js.map