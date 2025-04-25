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
exports.ensureProsodyCertificates = ensureProsodyCertificates;
exports.startProsodyCertificatesRenewCheck = startProsodyCertificatesRenewCheck;
exports.stopProsodyCertificatesRenewCheck = stopProsodyCertificatesRenewCheck;
exports.missingSelfSignedCertificates = missingSelfSignedCertificates;
const debug_1 = require("../debug");
const ctl_1 = require("./ctl");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process = __importStar(require("child_process"));
let renew;
function startProsodyCertificatesRenewCheck(options, config) {
    const logger = options.peertubeHelpers.logger;
    if (!config.certificates) {
        return;
    }
    const checkInterval = (0, debug_1.debugNumericParameter)(options, 'renewCertCheckInterval', 60000, 3600000 * 24);
    if (renew) {
        stopProsodyCertificatesRenewCheck(options);
    }
    logger.info('Starting Prosody Certificates Renew Check');
    renewCheck(options, config).then(() => { }, () => { });
    const timer = setInterval(() => {
        logger.debug('Checking if Prosody certificates need to be renewed');
        renewCheck(options, config).then(() => { }, () => { });
    }, checkInterval);
    renew = {
        timer
    };
}
function stopProsodyCertificatesRenewCheck(options) {
    const logger = options.peertubeHelpers.logger;
    if (renew === undefined) {
        return;
    }
    logger.info('Stoping Prosody Certificates Renew Check');
    clearInterval(renew.timer);
}
async function ensureProsodyCertificates(options, config) {
    if (config.certificates !== 'generate-self-signed') {
        return;
    }
    const logger = options.peertubeHelpers.logger;
    logger.info('Prosody needs certificates, checking if certificates are okay...');
    const prosodyDomain = config.host;
    const filepath = _filePathToTest(options, config);
    if (!filepath) {
        return;
    }
    if (fs.existsSync(filepath)) {
        logger.info(`The certificate ${filepath} exists, no need to generate it`);
        return;
    }
    if (!(0, debug_1.isDebugMode)(options, 'useOpenSSL')) {
        await (0, ctl_1.prosodyCtl)(options, 'cert', {
            additionalArgs: ['generate', prosodyDomain],
            yesMode: true,
            stdErrFilter: (data) => {
                if (data.match(/Generating \w+ private key/)) {
                    return false;
                }
                if (data.match(/^[.+o*\n]*$/m)) {
                    return false;
                }
                if (data.match(/e is \d+/)) {
                    return false;
                }
                return true;
            }
        });
    }
    if (!fs.existsSync(filepath)) {
        logger.warn(`The certificate ${filepath} creation (using prosodyctl) failed, trying to use openssl`);
        await _generateSelfSignedUsingOpenSSL(options, path.dirname(filepath), prosodyDomain);
    }
}
async function renewCheck(options, config) {
    if (config.certificates === 'generate-self-signed') {
        return renewCheckSelfSigned(options, config);
    }
    if (config.certificates === 'use-from-dir') {
        return renewCheckFromDir(options, config);
    }
    throw new Error('Unknown value for config.certificates');
}
async function renewCheckSelfSigned(options, config) {
    const logger = options.peertubeHelpers.logger;
    const renewEvery = (0, debug_1.debugNumericParameter)(options, 'renewSelfSignedCertInterval', 5 * 60000, 3600000 * 24 * 30 * 10);
    const filepath = _filePathToTest(options, config);
    if (!filepath) {
        return;
    }
    if (!fs.existsSync(filepath)) {
        logger.error('Missing certificate file: ' + filepath);
        return;
    }
    const stat = fs.statSync(filepath);
    const age = (new Date()).getTime() - stat.mtimeMs;
    if (age <= renewEvery) {
        logger.debug(`The age of the certificate ${filepath} is ${age}ms, which is less than the period ${renewEvery}ms`);
        return;
    }
    logger.info(`The age of the certificate ${filepath} is ${age}ms, which is more than the period ${renewEvery}ms`);
    await ensureProsodyCertificates(options, config);
    await (0, ctl_1.reloadProsody)(options);
}
async function missingSelfSignedCertificates(options, config) {
    if (config.certificates !== 'generate-self-signed') {
        return false;
    }
    const filepath = _filePathToTest(options, config);
    if (!filepath) {
        return false;
    }
    if (fs.existsSync(filepath)) {
        options.peertubeHelpers.logger.debug('Missing certificate file: ' + filepath);
        return false;
    }
    return true;
}
async function renewCheckFromDir(options, config) {
    const logger = options.peertubeHelpers.logger;
    if (!renew) {
        return;
    }
    let mtimeMs;
    const dir = config.paths.certs;
    if (!dir) {
        return;
    }
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach(file => {
        if (!file.isFile()) {
            return;
        }
        const stat = fs.statSync(path.resolve(dir, file.name));
        if (stat.mtimeMs > (mtimeMs ?? 0)) {
            mtimeMs = stat.mtimeMs;
        }
    });
    logger.debug('renewCheckFromDir: the most recent file in the certs dir has mtimeMs=' + (mtimeMs ?? '').toString());
    if (!mtimeMs) {
        return;
    }
    if (!renew.lastFromDirMtime) {
        renew.lastFromDirMtime = mtimeMs;
        return;
    }
    if (renew.lastFromDirMtime === mtimeMs) {
        logger.debug('No change in certs modification dates.');
        return;
    }
    logger.info('There is a file that was modified in the certs dir, reloading prosody...');
    await (0, ctl_1.reloadProsody)(options);
}
function _filePathToTest(options, config) {
    if (!config.paths.certs) {
        return null;
    }
    return path.resolve(config.paths.certs, config.host + '.crt');
}
async function _generateSelfSignedUsingOpenSSL(options, dir, prosodyDomain) {
    const logger = options.peertubeHelpers.logger;
    logger.info('Calling openssl to generate a self-signed certificate.');
    return new Promise((resolve, reject) => {
        const cmdArgs = [
            'req',
            '-new',
            '-x509',
            '-newkey',
            'rsa:2048',
            '-nodes',
            '-keyout',
            path.resolve(dir, `${prosodyDomain}.key`),
            '-days',
            '365',
            '-sha256',
            '-out',
            path.resolve(dir, `${prosodyDomain}.crt`),
            '-utf8',
            '-subj',
            `/CN=${prosodyDomain}`
        ];
        const spawned = child_process.spawn('openssl', cmdArgs, {
            cwd: dir,
            env: {
                ...process.env
            }
        });
        spawned.on('error', (err) => {
            logger.error(`Spawned openssl command failed: ${err}`);
            reject(err);
        });
        spawned.on('close', () => {
            resolve();
        });
    });
}
//# sourceMappingURL=certificates.js.map