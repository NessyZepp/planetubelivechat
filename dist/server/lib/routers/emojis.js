"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initEmojisRouter = initEmojisRouter;
const async_1 = require("../middlewares/async");
const emojis_1 = require("../emojis");
async function initEmojisRouter(options, router) {
    const logger = options.peertubeHelpers.logger;
    router.get('/emojis/channel/:channelId/definition', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        try {
            const emojis = emojis_1.Emojis.singletonSafe();
            if (!emojis) {
                res.sendStatus(404);
                return;
            }
            const channelId = parseInt(req.params.channelId);
            if (!channelId || isNaN(channelId)) {
                res.sendStatus(400);
                return;
            }
            if (!await emojis.channelHasCustomEmojis(channelId)) {
                res.sendStatus(404);
                return;
            }
            res.sendFile(emojis.channelCustomEmojisDefinitionPath(channelId));
        }
        catch (err) {
            logger.error(err);
            res.sendStatus(500);
        }
    }));
    router.get('/emojis/channel/:channelId/files/:fileName', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        try {
            const emojis = emojis_1.Emojis.singletonSafe();
            if (!emojis) {
                res.sendStatus(404);
                return;
            }
            const channelId = parseInt(req.params.channelId);
            if (!channelId || isNaN(channelId)) {
                res.sendStatus(400);
                return;
            }
            const fileName = req.params.fileName;
            if (!emojis.validImageFileName(fileName)) {
                res.sendStatus(400);
                return;
            }
            if (!await emojis.channelHasCustomEmojis(channelId)) {
                res.sendStatus(404);
                return;
            }
            res.sendFile(emojis.channelCustomEmojisFilePath(channelId, fileName), {
                immutable: true,
                maxAge: 1000 * 60 * 60 * 24
            }, (err) => {
                if (err) {
                    res.sendStatus(404);
                }
            });
        }
        catch (err) {
            logger.error(err);
            res.sendStatus(500);
        }
    }));
}
//# sourceMappingURL=emojis.js.map