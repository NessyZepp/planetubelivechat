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
exports.getProsodyAbout = getProsodyAbout;
exports.checkProsody = checkProsody;
exports.testProsodyRunning = testProsodyRunning;
exports.testProsodyCorrectlyRunning = testProsodyCorrectlyRunning;
exports.prepareProsody = prepareProsody;
exports.ensureProsodyRunning = ensureProsodyRunning;
exports.ensureProsodyNotRunning = ensureProsodyNotRunning;
exports.prosodyCtl = prosodyCtl;
exports.reloadProsody = reloadProsody;
const config_1 = require("./config");
const logrotate_1 = require("./logrotate");
const certificates_1 = require("./certificates");
const webchat_1 = require("../routers/webchat");
const fix_room_subject_1 = require("./fix-room-subject");
const fs = __importStar(require("fs"));
const child_process = __importStar(require("child_process"));
const debug_1 = require("../../lib/debug");
async function _ensureWorkingDir(options, workingDir, dataDir, certsDir, certsDirIsCustom, appImageExtractPath) {
    const logger = options.peertubeHelpers.logger;
    logger.debug('Calling _ensureworkingDir');
    if (!fs.existsSync(workingDir)) {
        logger.info(`The working dir ${workingDir} does not exists, trying to create it`);
        await fs.promises.mkdir(workingDir);
        logger.debug(`Working dir ${workingDir} was created`);
    }
    logger.debug(`Testing write access on ${workingDir}`);
    await fs.promises.access(workingDir, fs.constants.W_OK);
    logger.debug(`Write access ok on ${workingDir}`);
    if (!fs.existsSync(dataDir)) {
        logger.info(`The data dir ${dataDir} does not exists, trying to create it`);
        await fs.promises.mkdir(dataDir);
        logger.debug(`data dir ${dataDir} was created`);
    }
    if (certsDir && !certsDirIsCustom && !fs.existsSync(certsDir)) {
        logger.info(`The certs dir ${certsDir} does not exists, trying to create it`);
        await fs.promises.mkdir(certsDir);
        logger.debug(`certs dir ${certsDir} was created`);
    }
    if (!fs.existsSync(appImageExtractPath)) {
        logger.info(`The appImageExtractPath dir ${appImageExtractPath} does not exists, trying to create it`);
        await fs.promises.mkdir(appImageExtractPath);
        logger.debug(`appImageExtractPath dir ${appImageExtractPath} was created`);
    }
    return workingDir;
}
async function prepareProsody(options) {
    const logger = options.peertubeHelpers.logger;
    const filePaths = await (0, config_1.getProsodyFilePaths)(options);
    logger.debug('Ensuring that the working dir exists');
    await _ensureWorkingDir(options, filePaths.dir, filePaths.data, filePaths.certs, filePaths.certsDirIsCustom, filePaths.appImageExtractPath);
    try {
        await (0, fix_room_subject_1.fixRoomSubject)(options, filePaths);
    }
    catch (err) {
        logger.error(err);
    }
    const appImageToExtract = filePaths.appImageToExtract;
    if (!appImageToExtract) {
        return;
    }
    return new Promise((resolve, reject) => {
        const spawned = child_process.spawn(appImageToExtract, ['--appimage-extract'], {
            cwd: filePaths.appImageExtractPath,
            env: {
                ...process.env
            }
        });
        spawned.stdout.on('data', (data) => {
            logger.debug(`AppImage extract printed: ${data}`);
        });
        spawned.stderr.on('data', (data) => {
            logger.error(`AppImage extract has errors: ${data}`);
        });
        spawned.on('error', reject);
        spawned.on('close', (_code) => {
            (0, debug_1.disableLuaUnboundIfNeeded)(options, filePaths.appImageExtractPath);
            resolve();
        });
    });
}
async function prosodyCtl(options, command, prosodyCtlOptions) {
    const logger = options.peertubeHelpers.logger;
    logger.debug('Calling prosodyCtl with command ' + command);
    const filePaths = await (0, config_1.getProsodyFilePaths)(options);
    if (!/^\w+$/.test(command)) {
        throw new Error(`Invalid prosodyctl command '${command}'`);
    }
    return new Promise((resolve, reject) => {
        if (!filePaths.execCtl) {
            reject(new Error('Missing prosodyctl command executable'));
            return;
        }
        let d = '';
        let e = '';
        let m = '';
        const cmdArgs = [
            ...filePaths.execCtlArgs,
            '--config',
            filePaths.config,
            command
        ];
        prosodyCtlOptions?.additionalArgs?.forEach(arg => {
            cmdArgs.push(arg);
        });
        const spawned = child_process.spawn(filePaths.execCtl, cmdArgs, {
            cwd: filePaths.dir,
            env: {
                ...process.env,
                PROSODY_CONFIG: filePaths.config
            }
        });
        let yesModeInterval;
        if (prosodyCtlOptions?.yesMode) {
            yesModeInterval = setInterval(() => {
                options.peertubeHelpers.logger.debug('ProsodyCtl was called in yesMode, writing to standard input.');
                spawned.stdin.write('\n');
            }, 10);
            spawned.stdin.on('close', () => {
                options.peertubeHelpers.logger.debug('ProsodyCtl standard input closed, clearing interval.');
                clearInterval(yesModeInterval);
            });
            spawned.stdin.on('error', () => {
                options.peertubeHelpers.logger.debug('ProsodyCtl standard input errored, clearing interval.');
                clearInterval(yesModeInterval);
            });
        }
        spawned.stdout.on('data', (data) => {
            d += data;
            m += data;
        });
        spawned.stderr.on('data', (data) => {
            if (prosodyCtlOptions?.stdErrFilter) {
                if (!prosodyCtlOptions.stdErrFilter('' + data)) {
                    return;
                }
            }
            options.peertubeHelpers.logger.error(`Spawned command ${command} has errors: ${data}`);
            e += data;
            m += data;
        });
        spawned.on('error', reject);
        spawned.on('close', (code) => {
            resolve({
                code,
                stdout: d,
                sterr: e,
                message: m
            });
        });
    });
}
async function getProsodyAbout(options) {
    const ctl = await prosodyCtl(options, 'about');
    return ctl.message;
}
async function reloadProsody(options) {
    const reload = await prosodyCtl(options, 'reload');
    if (reload.code) {
        options.peertubeHelpers.logger.error('reloadProsody failed: ' + JSON.stringify(reload));
        return false;
    }
    return true;
}
async function checkProsody(options) {
    const ctl = await prosodyCtl(options, 'check');
    return ctl.message;
}
async function testProsodyRunning(options) {
    const { peertubeHelpers } = options;
    const logger = peertubeHelpers.logger;
    logger.info('Checking if Prosody is running');
    const result = {
        ok: false,
        messages: []
    };
    const filePaths = await (0, config_1.getProsodyFilePaths)(options);
    try {
        logger.debug('Trying to access the pid file');
        await fs.promises.access(filePaths.pid, fs.constants.R_OK);
        result.messages.push(`Pid file ${filePaths.pid} found`);
    }
    catch (error) {
        logger.debug(`Failed to access pid file: ${error}`);
        result.messages.push(`Pid file ${filePaths.pid} not found`);
        return result;
    }
    const status = await prosodyCtl(options, 'status');
    result.messages.push('Prosodyctl status: ' + status.message);
    if (status.code) {
        return result;
    }
    result.ok = true;
    return result;
}
async function testProsodyCorrectlyRunning(options) {
    const { peertubeHelpers } = options;
    peertubeHelpers.logger.info('Checking if Prosody is correctly running');
    const result = await testProsodyRunning(options);
    if (!result.ok) {
        return result;
    }
    result.ok = false;
    try {
        const wantedConfig = await (0, config_1.getProsodyConfig)(options);
        const filePath = wantedConfig.paths.config;
        await fs.promises.access(filePath, fs.constants.R_OK);
        result.messages.push(`The prosody configuration file (${filePath}) exists`);
        const actualContent = await fs.promises.readFile(filePath, {
            encoding: 'utf-8'
        });
        const wantedContent = wantedConfig.content;
        if (actualContent === wantedContent) {
            result.messages.push('Prosody configuration file content is correct.');
        }
        else {
            result.messages.push('Prosody configuration file content is not correct.');
            return result;
        }
        if (!await (0, certificates_1.missingSelfSignedCertificates)(options, wantedConfig)) {
            result.messages.push('No missing self signed certificates.');
        }
        else {
            result.messages.push('Missing self signed certificates.');
            return result;
        }
    }
    catch (error) {
        result.messages.push('Error when requiring the prosody config file: ' + error);
        return result;
    }
    result.ok = true;
    return result;
}
async function ensureProsodyRunning(options, forceRestart, restartProsodyInDebugMode) {
    const { peertubeHelpers } = options;
    const logger = peertubeHelpers.logger;
    logger.debug('Calling ensureProsodyRunning');
    if (forceRestart) {
        logger.info('We want to force Prosody restart, skip checking the current state');
    }
    else {
        const r = await testProsodyCorrectlyRunning(options);
        if (r.ok) {
            r.messages.forEach(m => logger.debug(m));
            logger.info('Prosody is already running correctly');
            return;
        }
        logger.info('Prosody is not running correctly: ');
        r.messages.forEach(m => logger.info(m));
    }
    logger.debug('Shutting down prosody');
    await ensureProsodyNotRunning(options);
    logger.debug('Writing the configuration file');
    const config = await (0, config_1.writeProsodyConfig)(options);
    const filePaths = config.paths;
    if (!filePaths.exec) {
        logger.info('No Prosody executable, cant run.');
        return;
    }
    await (0, certificates_1.ensureProsodyCertificates)(options, config);
    let execArgs = filePaths.execArgs;
    if (restartProsodyInDebugMode) {
        if (!filePaths.exec.includes('squashfs-root')) {
            logger.error('Trying to enable the Prosody Debugger, but not using the AppImage. Cant work.');
        }
        else {
            const debuggerOptions = (0, debug_1.prosodyDebuggerOptions)(options);
            if (debuggerOptions) {
                execArgs = [
                    'debug',
                    debuggerOptions.mobdebugPath,
                    debuggerOptions.mobdebugHost,
                    debuggerOptions.mobdebugPort,
                    ...execArgs
                ];
            }
        }
    }
    logger.info('Going to launch prosody (' +
        filePaths.exec +
        (execArgs.length ? ' ' + execArgs.join(' ') : '') +
        ')');
    const prosody = child_process.spawn(filePaths.exec, execArgs, {
        cwd: filePaths.dir,
        env: {
            ...process.env,
            PROSODY_CONFIG: filePaths.config
        }
    });
    prosody.stdout?.on('data', (data) => {
        logger.debug(`Prosody stdout: ${data}`);
    });
    prosody.stderr?.on('data', (data) => {
        logger.error(`Prosody stderr: ${data}`);
    });
    prosody.on('error', (error) => {
        logger.error(`Prosody exec error: ${JSON.stringify(error)}`);
    });
    prosody.on('close', (code) => {
        logger.info(`Prosody process closed all stdio with code ${code ?? 'null'}`);
    });
    prosody.on('exit', (code) => {
        logger.info(`Prosody process exited with code ${code ?? 'null'}`);
    });
    await (0, webchat_1.enableProxyRoute)(options, {
        host: config.host,
        port: config.port
    });
    async function sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
    logger.info('Waiting for the prosody process to launch');
    let count = 0;
    let processStarted = false;
    while (!processStarted && count < 5) {
        count++;
        await sleep(500);
        logger.info('Verifying prosody is launched');
        const status = await prosodyCtl(options, 'status');
        if (!status.code) {
            logger.info(`Prosody status: ${status.stdout}`);
            processStarted = true;
        }
        else {
            logger.warn(`Prosody status: ${status.message}`);
        }
    }
    if (!processStarted) {
        logger.error('It seems that the Prosody process is not up');
        return;
    }
    logger.info('Prosody is running');
    (0, logrotate_1.startProsodyLogRotate)(options, filePaths);
    (0, certificates_1.startProsodyCertificatesRenewCheck)(options, config);
}
async function ensureProsodyNotRunning(options) {
    const { peertubeHelpers } = options;
    const logger = peertubeHelpers.logger;
    logger.info('Checking if Prosody is running, and shutting it down if so');
    (0, logrotate_1.stopProsodyLogRotate)(options);
    (0, certificates_1.stopProsodyCertificatesRenewCheck)(options);
    const filePaths = await (0, config_1.getProsodyFilePaths)(options);
    if (!fs.existsSync(filePaths.dir)) {
        logger.info(`The working dir ${filePaths.dir} does not exist, assuming there is no prosody on this server`);
        return;
    }
    logger.debug('Removing proxy route');
    await (0, webchat_1.disableProxyRoute)(options);
    logger.debug('Calling prosodyctl to stop the process');
    const status = await prosodyCtl(options, 'stop');
    logger.info(`ProsodyCtl command returned: ${status.message}`);
}
//# sourceMappingURL=ctl.js.map