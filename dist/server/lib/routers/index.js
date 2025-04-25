"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRouters = initRouters;
const webchat_1 = require("./webchat");
const settings_1 = require("./settings");
const api_1 = require("./api");
const oidc_1 = require("./oidc");
async function initRouters(options) {
    const { getRouter } = options;
    const router = getRouter();
    router.get('/ping', (req, res, _next) => {
        res.json({ message: 'pong' });
    });
    router.use('/webchat', await (0, webchat_1.initWebchatRouter)(options));
    router.use('/settings', await (0, settings_1.initSettingsRouter)(options));
    router.use('/api', await (0, api_1.initApiRouter)(options));
    router.use('/oidc', await (0, oidc_1.initOIDCRouter)(options));
}
//# sourceMappingURL=index.js.map