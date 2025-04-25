"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOIDCRouter = initOIDCRouter;
const async_1 = require("../middlewares/async");
const oidc_1 = require("../external-auth/oidc");
const error_1 = require("../external-auth/error");
const manage_users_1 = require("../prosody/api/manage-users");
function popupResultHTML(result) {
    return `<!DOCTYPE html><html>
    <body>
      <noscript>Your browser must enable javascript for this page to work.</noscript>
      <script>
        try {
          const data = ${JSON.stringify(result)};
          if (!window.opener || !window.opener.externalAuthGetResult) {
            throw new Error("Can't find parent window callback handler.")
          }
          window.opener.externalAuthGetResult(data);
          window.close();
        } catch (err) {
          document.body.innerText = 'Error: ' + err;
        }
      </script>
    </body>
  </html> `;
}
async function initOIDCRouter(options) {
    const { peertubeHelpers, getRouter } = options;
    const router = getRouter();
    const logger = peertubeHelpers.logger;
    router.get('/:type?/connect', (0, async_1.asyncMiddleware)(async (req, res, next) => {
        const singletonType = req.params.type ?? 'custom';
        logger.info('[oidc router] OIDC connect call (' + singletonType + ')');
        try {
            const oidc = oidc_1.ExternalAuthOIDC.singleton(singletonType);
            const oidcClient = await oidc.load();
            if (!oidcClient) {
                throw new Error('[oidc router] External Auth OIDC not loaded yet');
            }
            const redirectUrl = await oidc.initAuthenticationProcess(req, res);
            res.redirect(redirectUrl);
        }
        catch (err) {
            logger.error('[oidc router] Failed to process the OIDC connect call: ' + err);
            next();
        }
    }));
    const cbHandler = (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        const singletonType = req.params.type ?? 'custom';
        logger.info('[oidc router] OIDC callback call (' + singletonType + ')');
        try {
            const oidc = oidc_1.ExternalAuthOIDC.singleton(singletonType);
            const oidcClient = await oidc.load();
            if (!oidcClient) {
                throw new Error('[oidc router] External Auth OIDC not loaded yet');
            }
            const externalAccountInfos = await oidc.validateAuthenticationProcess(req);
            logger.debug('external account infos: ' + JSON.stringify(Object.assign({}, externalAccountInfos, {
                password: '**removed**',
                token: '**removed**',
                avatar: externalAccountInfos.avatar
                    ? `**removed** ${externalAccountInfos.avatar.mimetype} avatar`
                    : undefined
            })));
            if (!await (0, manage_users_1.ensureUser)(options, externalAccountInfos)) {
                throw new error_1.ExternalAuthenticationError('Failing to create your account, please try again later or report this issue');
            }
            res.send(popupResultHTML({
                ok: true,
                token: externalAccountInfos.token
            }));
        }
        catch (err) {
            logger.error('[oidc router] Failed to process the OIDC callback: ' + err);
            const message = err instanceof error_1.ExternalAuthenticationError ? err.message : undefined;
            res.status(500);
            res.send(popupResultHTML({
                ok: false,
                message
            }));
        }
    });
    router.get('/:type?/cb', cbHandler);
    router.post('/:type?/cb', cbHandler);
    return router;
}
//# sourceMappingURL=oidc.js.map