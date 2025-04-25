"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebchatRouter = initWebchatRouter;
exports.disableProxyRoute = disableProxyRoute;
exports.enableProxyRoute = enableProxyRoute;
const http_proxy_1 = require("http-proxy");
const helpers_1 = require("../helpers");
const async_1 = require("../middlewares/async");
const autocolors_1 = require("../../../shared/lib/autocolors");
const fetch_infos_1 = require("../federation/fetch-infos");
const params_1 = require("../conversejs/params");
const host_1 = require("../prosody/api/host");
const channel_1 = require("../database/channel");
const manage_rooms_1 = require("../prosody/api/manage-rooms");
const loc_1 = require("../loc");
const path = __importStar(require("path"));
const escapeHTML = require('escape-html');
const fs = require('fs').promises;
let currentHttpBindProxy = null;
let currentWebsocketProxy = null;
let currentS2SWebsocketProxy = null;
class LivechatError extends Error {
    constructor(e) {
        super(e.message);
        this.livechatError = e;
    }
}
async function initWebchatRouter(options) {
    const { getRouter, registerWebSocketRoute, peertubeHelpers } = options;
    const converseJSIndex = await fs.readFile(path.resolve(__dirname, '../../conversejs/index.html'));
    const router = getRouter();
    router.get('/room/:roomKey', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        try {
            res.removeHeader('X-Frame-Options');
            const roomKey = req.params.roomKey;
            let readonly = false;
            if (req.query._readonly === 'true') {
                readonly = true;
            }
            else if (req.query._readonly === 'noscroll') {
                readonly = 'noscroll';
            }
            const initConverseJSParam = await (0, params_1.getConverseJSParams)(options, roomKey, {
                readonly,
                transparent: req.query._transparent === 'true',
                forcetype: req.query.forcetype === '1',
                forceDefaultHideMucParticipants: req.query.force_default_hide_muc_participants === '1'
            });
            if (('isError' in initConverseJSParam)) {
                throw new LivechatError(initConverseJSParam);
            }
            let page = '' + converseJSIndex;
            page = page.replace(/{{BASE_STATIC_URL}}/g, initConverseJSParam.staticBaseUrl);
            const settings = await options.settingsManager.getSettings([
                'converse-theme', 'converse-autocolors'
            ]);
            let autocolorsStyles = '';
            if (settings['converse-autocolors'] &&
                (0, autocolors_1.isAutoColorsAvailable)(settings['converse-theme'])) {
                peertubeHelpers.logger.debug('Trying to load AutoColors...');
                const autocolors = {
                    mainForeground: req.query._ac_mainForeground?.toString() ?? '',
                    mainBackground: req.query._ac_mainBackground?.toString() ?? '',
                    greyForeground: req.query._ac_greyForeground?.toString() ?? '',
                    greyBackground: req.query._ac_greyBackground?.toString() ?? '',
                    menuForeground: req.query._ac_menuForeground?.toString() ?? '',
                    menuBackground: req.query._ac_menuBackground?.toString() ?? '',
                    inputForeground: req.query._ac_inputForeground?.toString() ?? '',
                    inputBackground: req.query._ac_inputBackground?.toString() ?? '',
                    buttonForeground: req.query._ac_buttonForeground?.toString() ?? '',
                    buttonBackground: req.query._ac_buttonBackground?.toString() ?? '',
                    link: req.query._ac_link?.toString() ?? '',
                    linkHover: req.query._ac_linkHover?.toString() ?? ''
                };
                if (!Object.values(autocolors).find(c => c !== '')) {
                    peertubeHelpers.logger.debug('All AutoColors are empty.');
                }
                else {
                    const autoColorsTest = (0, autocolors_1.areAutoColorsValid)(autocolors);
                    if (autoColorsTest === true) {
                        autocolorsStyles = `
              <style>
                body.converse-fullscreen.theme-peertube {
                  --peertube-main-foreground: ${autocolors.mainForeground};
                  --peertube-main-background: ${autocolors.mainBackground};
                  --peertube-grey-foreground: ${autocolors.greyForeground};
                  --peertube-grey-background: ${autocolors.greyBackground};
                  --peertube-menu-foreground: ${autocolors.menuForeground};
                  --peertube-menu-background: ${autocolors.menuBackground};
                  --peertube-input-foreground: ${autocolors.inputForeground};
                  --peertube-input-background: ${autocolors.inputBackground};
                  --peertube-button-foreground: ${autocolors.buttonForeground};
                  --peertube-button-background: ${autocolors.buttonBackground};
                  --peertube-link: ${autocolors.link};
                  --peertube-link-hover: ${autocolors.linkHover};
                }
              </style>
              `;
                    }
                    else {
                        peertubeHelpers.logger.error('Provided AutoColors are invalid.', autoColorsTest);
                    }
                }
            }
            else {
                peertubeHelpers.logger.debug('No AutoColors.');
            }
            page = page.replace(/{{CONVERSEJS_AUTOCOLORS}}/g, autocolorsStyles);
            page = page.replace('{INIT_CONVERSE_PARAMS}', JSON.stringify(initConverseJSParam));
            res.status(200);
            res.type('html');
            res.send(page);
        }
        catch (err) {
            const code = err.livechatError?.code ?? 500;
            const additionnalMessage = escapeHTML(err.livechatError?.message ?? '');
            const message = escapeHTML((0, loc_1.loc)('chatroom_not_accessible'));
            res.status(typeof code === 'number' ? code : 500);
            res.send(`<!DOCTYPE html PUBLIC "-//IETF//DTD HTML 2.0//EN"><html>
          <head><title>${message}</title></head>
          <body>
            <h1>${message}</h1>
            <p>${additionnalMessage}</p>
          </body>
        </html>`);
        }
    }));
    await disableProxyRoute(options);
    router.post('/http-bind', (req, res, next) => {
        try {
            if (!currentHttpBindProxy) {
                res.status(404);
                res.send('Not found');
                return;
            }
            req.url = 'http-bind';
            currentHttpBindProxy.web(req, res);
        }
        catch (err) {
            next(err);
        }
    });
    router.options('/http-bind', (req, res, next) => {
        try {
            if (!currentHttpBindProxy) {
                res.status(404);
                res.send('Not found');
                return;
            }
            req.url = 'http-bind';
            currentHttpBindProxy.web(req, res);
        }
        catch (err) {
            next(err);
        }
    });
    if (registerWebSocketRoute) {
        registerWebSocketRoute({
            route: '/xmpp-websocket',
            handler: (request, socket, head) => {
                try {
                    if (!currentWebsocketProxy) {
                        peertubeHelpers.logger.error('There is no current websocket proxy, should not get here.');
                        return;
                    }
                    currentWebsocketProxy.ws(request, socket, head);
                }
                catch (err) {
                    peertubeHelpers.logger.error('Got an error when trying to connect to S2S', err);
                }
            }
        });
        registerWebSocketRoute({
            route: '/xmpp-websocket-s2s',
            handler: async (request, socket, head) => {
                try {
                    if (!currentS2SWebsocketProxy) {
                        peertubeHelpers.logger.error('There is no current websocket s2s proxy, should not get here.');
                        return;
                    }
                    const remoteInstanceUrl = request.headers['peertube-livechat-ws-s2s-instance-url'];
                    if (remoteInstanceUrl && (typeof remoteInstanceUrl === 'string')) {
                        await (0, fetch_infos_1.fetchMissingRemoteServerInfos)(options, remoteInstanceUrl);
                    }
                    currentS2SWebsocketProxy.ws(request, socket, head);
                }
                catch (err) {
                    peertubeHelpers.logger.error('Got an error when trying to connect to Websocket S2S', err);
                }
            }
        });
    }
    router.get('/prosody-list-rooms', (0, async_1.asyncMiddleware)(async (req, res, _next) => {
        if (!res.locals.authenticated) {
            res.sendStatus(403);
            return;
        }
        if (!await (0, helpers_1.isUserAdmin)(options, res)) {
            res.sendStatus(403);
            return;
        }
        const rooms = await (0, manage_rooms_1.listProsodyRooms)(options);
        if (Array.isArray(rooms)) {
            for (let i = 0; i < rooms.length; i++) {
                const room = rooms[i];
                const matches = room.localpart.match(/^channel\.(\d+)$/);
                if (matches?.[1]) {
                    const channelId = parseInt(matches[1]);
                    const channelInfos = await (0, channel_1.getChannelInfosById)(options, channelId);
                    if (channelInfos) {
                        room.channel = {
                            id: channelInfos.id,
                            name: channelInfos.name,
                            displayName: channelInfos.displayName
                        };
                    }
                }
            }
        }
        res.status(200);
        const r = {
            ok: true,
            rooms
        };
        res.json(r);
    }));
    return router;
}
async function disableProxyRoute({ peertubeHelpers }) {
    try {
        (0, host_1.delCurrentProsody)();
        if (currentHttpBindProxy) {
            peertubeHelpers.logger.info('Closing the http bind proxy...');
            currentHttpBindProxy.close();
            currentHttpBindProxy = null;
        }
        if (currentWebsocketProxy) {
            peertubeHelpers.logger.info('Closing the websocket proxy...');
            currentWebsocketProxy.close();
            currentWebsocketProxy = null;
        }
        if (currentS2SWebsocketProxy) {
            peertubeHelpers.logger.info('Closing the s2s websocket proxy...');
            currentS2SWebsocketProxy.close();
            currentS2SWebsocketProxy = null;
        }
    }
    catch (err) {
        peertubeHelpers.logger.error('Seems that the http bind proxy close has failed: ' + err);
    }
}
async function enableProxyRoute({ peertubeHelpers }, prosodyProxyInfo) {
    const logger = peertubeHelpers.logger;
    if (!/^\d+$/.test(prosodyProxyInfo.port)) {
        logger.error(`Port '${prosodyProxyInfo.port}' is not valid. Aborting.`);
        return;
    }
    (0, host_1.setCurrentProsody)(prosodyProxyInfo.host, prosodyProxyInfo.port);
    logger.info('Creating a new http bind proxy');
    currentHttpBindProxy = (0, http_proxy_1.createProxyServer)({
        target: 'http://localhost:' + prosodyProxyInfo.port + '/http-bind',
        ignorePath: true
    });
    currentHttpBindProxy.on('error', (err, req, res) => {
        logger.error('The http bind proxy got an error ' +
            '(this can be normal if you updated/uninstalled the plugin, or shutdowned peertube while users were chatting): ' +
            err.message);
        if ('writeHead' in res) {
            res.writeHead(500);
        }
        res.end('');
    });
    currentHttpBindProxy.on('close', () => {
        logger.info('Got a close event for the http bind proxy');
    });
    logger.info('Creating a new websocket proxy');
    currentWebsocketProxy = (0, http_proxy_1.createProxyServer)({
        target: 'http://localhost:' + prosodyProxyInfo.port + '/xmpp-websocket',
        ignorePath: true,
        ws: true
    });
    currentWebsocketProxy.on('error', (err, req, res) => {
        logger.error('The websocket proxy got an error ' +
            '(this can be normal if you updated/uninstalled the plugin, or shutdowned peertube while users were chatting): ' +
            err.message);
        if ('writeHead' in res) {
            res.writeHead(500);
        }
        res.end('');
    });
    currentWebsocketProxy.on('close', () => {
        logger.info('Got a close event for the websocket proxy');
    });
    logger.info('Creating a new s2s websocket proxy');
    currentS2SWebsocketProxy = (0, http_proxy_1.createProxyServer)({
        target: 'http://localhost:' + prosodyProxyInfo.port + '/xmpp-websocket-s2s',
        ignorePath: true,
        ws: true
    });
    currentS2SWebsocketProxy.on('error', (err, req, res) => {
        logger.error('The s2s websocket proxy got an error ' +
            '(this can be normal if you updated/uninstalled the plugin, or shutdowned peertube while users were chatting): ' +
            err.message);
        if ('writeHead' in res) {
            res.writeHead(500);
        }
        res.end('');
    });
    currentS2SWebsocketProxy.on('close', () => {
        logger.info('Got a close event for the s2s websocket proxy');
    });
}
//# sourceMappingURL=webchat.js.map