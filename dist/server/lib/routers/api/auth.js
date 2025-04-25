"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAuthApiRouter = initAuthApiRouter;
exports.initUserAuthApiRouter = initUserAuthApiRouter;
const async_1 = require("../../middlewares/async");
const domain_1 = require("../../prosody/config/domain");
const auth_1 = require("../../prosody/auth");
const oidc_1 = require("../../external-auth/oidc");
async function initAuthApiRouter(options, router) {
    router.get('/auth', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        const user = await options.peertubeHelpers.user.getAuthUser(res);
        if (!user) {
            const token = req.header('X-Peertube-Plugin-Livechat-External-Auth-OIDC-Token');
            if (token) {
                try {
                    const oidc = oidc_1.ExternalAuthOIDC.singletonForToken(token);
                    if (oidc && await oidc.isOk()) {
                        const unserializedToken = await oidc.unserializeToken(token);
                        if (unserializedToken) {
                            res.status(200).json({
                                jid: unserializedToken.jid,
                                password: unserializedToken.password,
                                nickname: unserializedToken.nickname,
                                type: 'oidc'
                            });
                            return;
                        }
                    }
                }
                catch (err) {
                    options.peertubeHelpers.logger.error(err);
                }
            }
        }
        const tempPassword = await auth_1.LivechatProsodyAuth.singleton().getUserTempPassword(user);
        if (!tempPassword) {
            res.sendStatus(403);
            return;
        }
        res.status(200).json(tempPassword);
    }));
    router.get('/auth/tokens', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        const user = await options.peertubeHelpers.user.getAuthUser(res);
        try {
            const tokens = await auth_1.LivechatProsodyAuth.singleton().getUserTokens(user);
            if (!tokens) {
                res.sendStatus(403);
                return;
            }
            res.status(200).json(tokens);
        }
        catch (err) {
            options.peertubeHelpers.logger.error(err);
            res.sendStatus(500);
        }
    }));
    router.post('/auth/tokens', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        const user = await options.peertubeHelpers.user.getAuthUser(res);
        try {
            const label = req.body.label;
            if ((typeof label !== 'string') || !label) {
                res.sendStatus(400);
                return;
            }
            const token = await auth_1.LivechatProsodyAuth.singleton().createUserToken(user, label);
            if (!token) {
                res.sendStatus(403);
                return;
            }
            res.status(200).json(token);
        }
        catch (err) {
            options.peertubeHelpers.logger.error(err);
            res.sendStatus(500);
        }
    }));
    router.delete('/auth/tokens/:tokenId', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        const user = await options.peertubeHelpers.user.getAuthUser(res);
        try {
            const tokenId = parseInt(req.params.tokenId);
            if (isNaN(tokenId)) {
                res.sendStatus(400);
                return;
            }
            const r = await auth_1.LivechatProsodyAuth.singleton().revokeUserToken(user, tokenId);
            if (!r) {
                res.sendStatus(403);
                return;
            }
            res.status(200).json(true);
        }
        catch (err) {
            options.peertubeHelpers.logger.error(err);
            res.sendStatus(500);
        }
    }));
}
async function initUserAuthApiRouter(options, router) {
    const logger = options.peertubeHelpers.logger;
    router.post('/user/register', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        res.sendStatus(501);
    }));
    router.get('/user/check_password', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
        const user = req.query.user;
        const server = req.query.server;
        const pass = req.query.pass;
        if (server !== prosodyDomain) {
            logger.warn(`Cannot call check_password on user on server ${server}.`);
            res.status(200).send('false');
            return;
        }
        if (user && pass && await auth_1.LivechatProsodyAuth.singleton().checkUserPassword(user, pass)) {
            res.status(200).send('true');
            return;
        }
        res.status(200).send('false');
    }));
    router.get('/user/user_exists', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        const prosodyDomain = await (0, domain_1.getProsodyDomain)(options);
        const user = req.query.user;
        const server = req.query.server;
        if (server !== prosodyDomain) {
            logger.warn(`Cannot call user_exists on user on server ${server}.`);
            res.status(200).send('false');
            return;
        }
        if (user && await auth_1.LivechatProsodyAuth.singleton().userRegistered(user)) {
            res.status(200).send('true');
            return;
        }
        res.status(200).send('false');
    }));
    router.post('/user/set_password', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        res.sendStatus(501);
    }));
    router.post('/user/remove_user', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        res.sendStatus(501);
    }));
}
//# sourceMappingURL=auth.js.map