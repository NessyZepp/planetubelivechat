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
exports.BotsCtl = void 0;
const bot_1 = require("../configuration/bot");
const helpers_1 = require("../helpers");
const child_process = __importStar(require("child_process"));
const path = __importStar(require("path"));
let singleton;
class BotsCtl {
    constructor(params) {
        this.options = params.options;
        this.moderationGlobalConf = params.moderationGlobalConf;
        const logger = params.options.peertubeHelpers.logger;
        this.logger = {
            debug: (s) => logger.debug('[Bots] ' + s),
            info: (s) => logger.info('[Bots] ' + s),
            warn: (s) => logger.warn('[Bots] ' + s),
            error: (s) => logger.error('[Bots] ' + s)
        };
    }
    async start() {
        if (await this.options.settingsManager.getSetting('disable-channel-configuration')) {
            this.logger.info('Advanced channel configuration is disabled, no bot to start');
            return;
        }
        this.logger.info('Starting moderation bot...');
        if (this.moderationBotProcess?.exitCode === null) {
            this.logger.info('Moderation bot still running, nothing to do');
            return;
        }
        const paths = bot_1.BotConfiguration.singleton().configurationPaths();
        const botExecPath = this._botExecPath();
        const execArgs = [
            'run',
            '-f',
            paths.moderation.globalFile,
            '--room-conf-dir',
            paths.moderation.roomConfDir
        ];
        const moderationBotProcess = child_process.spawn(botExecPath, execArgs, {
            cwd: __dirname,
            env: {
                ...process.env,
                NODE_TLS_REJECT_UNAUTHORIZED: '0'
            }
        });
        moderationBotProcess.stdout?.on('data', (data) => {
            this.logger.debug(`ModerationBot stdout: ${data}`);
        });
        moderationBotProcess.stderr?.on('data', (data) => {
            data = data.toString();
            if (/Warning.*NODE_TLS_REJECT_UNAUTHORIZED.*'0'.*TLS/.test(data)) {
                this.logger.debug(`ModerationBot stderr: ${data}`);
                return;
            }
            this.logger.error(`ModerationBot stderr: ${data}`);
        });
        moderationBotProcess.on('error', (error) => {
            this.logger.error(`ModerationBot exec error: ${JSON.stringify(error)}`);
        });
        moderationBotProcess.on('exit', (code) => {
            this.logger.info(`ModerationBot process exited with code ${code ?? 'null'}`);
        });
        moderationBotProcess.on('close', (code) => {
            this.logger.info(`ModerationBot process closed all stdio with code ${code ?? 'null'}`);
        });
        this.moderationBotProcess = moderationBotProcess;
    }
    async stop() {
        this.logger.info('Stopping bots...');
        if (!this.moderationBotProcess) {
            this.logger.info('moderationBot was never running, everything is fine.');
            return;
        }
        if (this.moderationBotProcess.exitCode !== null) {
            this.logger.info('The moderation bot has an exitCode, already stopped.');
            return;
        }
        const p = new Promise((resolve, reject) => {
            try {
                if (!this.moderationBotProcess) {
                    resolve();
                    return;
                }
                const moderationBotProcess = this.moderationBotProcess;
                let resolved = false;
                const ms = 2000;
                const timeout = setTimeout(() => {
                    try {
                        this.logger.error('Moderation bot was not killed within ' + ms.toString() + 'ms, force killing');
                        moderationBotProcess.kill('SIGKILL');
                    }
                    catch (_err) { }
                    resolved = true;
                    resolve();
                }, ms);
                moderationBotProcess.on('exit', () => {
                    if (resolved) {
                        return;
                    }
                    resolved = true;
                    resolve();
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                });
                moderationBotProcess.on('close', () => {
                    if (resolved) {
                        return;
                    }
                    resolved = true;
                    resolve();
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                });
                moderationBotProcess.kill();
            }
            catch (err) {
                this.logger.error(err);
                reject(err);
            }
        });
        return p;
    }
    static async initSingleton(options) {
        const moderationGlobalConf = await bot_1.BotConfiguration.singleton().getModerationBotGlobalConf(true);
        singleton = new BotsCtl({
            options,
            moderationGlobalConf
        });
        return singleton;
    }
    static singleton() {
        if (!singleton) {
            throw new Error('Bots singleton not initialized yet');
        }
        return singleton;
    }
    static async destroySingleton() {
        if (!singleton) {
            return;
        }
        await singleton.stop();
        singleton = undefined;
    }
    _botExecPath() {
        let dir = __dirname;
        let watchDog = 100;
        this.logger.debug('Searching the bot binary, in the ' + helpers_1.pluginName + ' folder');
        while ((watchDog--) > 0 && path.basename(dir) !== helpers_1.pluginName && dir !== '/') {
            dir = path.resolve(dir, '..');
        }
        if (path.basename(dir) !== helpers_1.pluginName) {
            this.logger.error('Cant find the ' + helpers_1.pluginName + ' base dir, and so cant find the bot exec path.');
            throw new Error('Cant find the bot exec path');
        }
        const result = path.resolve(dir, 'node_modules', '.bin', 'xmppjs-chat-bot');
        this.logger.info(`The bot path should be ${result}`);
        return result;
    }
}
exports.BotsCtl = BotsCtl;
//# sourceMappingURL=ctl.js.map