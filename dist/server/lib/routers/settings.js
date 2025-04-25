"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSettingsRouter = initSettingsRouter;
const diagnostic_1 = require("../diagnostic");
const helpers_1 = require("../helpers");
const async_1 = require("../middlewares/async");
async function initSettingsRouter(options) {
    const { peertubeHelpers, getRouter } = options;
    const router = getRouter();
    const logger = peertubeHelpers.logger;
    router.get('/diagnostic', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        logger.info('Accessing peertube-plugin-livechat diagnostic tool.');
        const src = (0, helpers_1.getBaseStaticRoute)(options) + 'settings/settings.js';
        res.status(200);
        res.type('html');
        res.send(`<html>
        <body><div>Loading...</div></body>
        <script type="module" src="${src}"></script>
        </html>
      `);
    }));
    router.post('/diagnostic/test', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        if (!res.locals.authenticated) {
            res.sendStatus(403);
            return;
        }
        if (!await (0, helpers_1.isUserAdmin)(options, res)) {
            res.sendStatus(403);
            return;
        }
        const test = req.body.test || '';
        logger.info('Accessing peertube-plugin-livechat diagnostic tool, test "' + test + '".');
        const result = await (0, diagnostic_1.diag)(test, options);
        res.status(200);
        res.json(result);
    }));
    return router;
}
//# sourceMappingURL=settings.js.map