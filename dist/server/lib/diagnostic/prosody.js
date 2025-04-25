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
exports.diagProsody = diagProsody;
const config_1 = require("../prosody/config");
const ctl_1 = require("../prosody/ctl");
const utils_1 = require("./utils");
const apikey_1 = require("../apikey");
const help_1 = require("../../../shared/lib/help");
const fs = __importStar(require("fs"));
const got = require('got');
async function diagProsody(test, options) {
    const result = (0, utils_1.newResult)(test);
    result.label = 'Builtin Prosody and ConverseJS';
    try {
        const workingDir = await (0, config_1.getWorkingDir)(options);
        result.messages.push('The working dir is: ' + workingDir);
    }
    catch (error) {
        result.messages.push('Error when requiring the working dir: ' + error);
        return result;
    }
    let prosodyPort;
    let prosodyHost;
    let prosodyErrorLogPath;
    try {
        const wantedConfig = await (0, config_1.getProsodyConfig)(options);
        const filePath = wantedConfig.paths.config;
        prosodyErrorLogPath = wantedConfig.paths.error;
        result.messages.push(`Prosody will run on port '${wantedConfig.port}'`);
        prosodyPort = wantedConfig.port;
        prosodyHost = wantedConfig.host;
        result.messages.push(`Prosody will use ${wantedConfig.baseApiUrl} as base uri from api calls`);
        if (!wantedConfig.paths.exec) {
            result.messages.push({
                level: 'error',
                message: 'Error: no Prosody server.'
            });
            if (process.arch !== 'x64' && process.arch !== 'x86_64' && process.arch !== 'arm64') {
                result.messages.push({
                    level: 'error',
                    message: 'Error: your CPU is a ' +
                        process.arch + ', ' +
                        'which is not compatible with the plugin. ' +
                        'Please read the plugin installation documentation for a workaround.'
                });
            }
            return result;
        }
        result.messages.push(`Prosody path will be '${wantedConfig.paths.exec}'`);
        if (wantedConfig.paths.appImageToExtract) {
            result.messages.push(`Prosody will be using the '${wantedConfig.paths.appImageToExtract}' AppImage`);
        }
        else {
            result.messages.push('Prosody will not be using any AppImage');
        }
        result.messages.push(`Prosody AppImage extract path will be '${wantedConfig.paths.appImageExtractPath}'`);
        result.messages.push(`Prosody modules path will be '${wantedConfig.paths.modules}'`);
        result.messages.push(`Prosody rooms will be grouped by '${wantedConfig.roomType}'.`);
        if (wantedConfig.logByDefault) {
            result.messages.push('By default, room content will be archived.');
        }
        else {
            result.messages.push('By default, room content will not be archived.');
        }
        if ('error' in wantedConfig.logExpiration) {
            result.messages.push({
                level: 'error',
                message: 'Errors: Room logs expiration value is not valid. Using the default value.'
            });
        }
        result.messages.push(`Room content will be saved for '${wantedConfig.logExpiration.value}'`);
        if (wantedConfig.paths.certs === undefined) {
            result.messages.push({
                level: 'error',
                message: 'Error: The certificates path is misconfigured.'
            });
            return result;
        }
        await fs.promises.access(filePath, fs.constants.R_OK);
        result.messages.push(`The prosody configuration file (${filePath}) exists`);
        const actualContent = await fs.promises.readFile(filePath, {
            encoding: 'utf-8'
        });
        result.debug.push({
            title: 'Current prosody configuration',
            message: (0, config_1.getProsodyConfigContentForDiagnostic)(wantedConfig, actualContent)
        });
        const wantedContent = wantedConfig.content;
        if (actualContent === wantedContent) {
            result.messages.push('Prosody configuration file content is correct.');
        }
        else {
            result.messages.push('Prosody configuration file content is not correct.');
            result.debug.push({
                title: 'Prosody configuration should be',
                message: (0, config_1.getProsodyConfigContentForDiagnostic)(wantedConfig)
            });
            return result;
        }
    }
    catch (error) {
        result.messages.push('Error when requiring the prosody config file: ' + error);
        return result;
    }
    const isCorrectlyRunning = await (0, ctl_1.testProsodyCorrectlyRunning)(options);
    if (isCorrectlyRunning.messages.length) {
        result.messages.push(...isCorrectlyRunning.messages);
    }
    const about = await (0, ctl_1.getProsodyAbout)(options);
    result.debug.push({
        title: 'Prosody version',
        message: about
    });
    if (!isCorrectlyRunning.ok) {
        return result;
    }
    const versionMatches = about.match(/^Prosody\s*(\d+)\.(\d+)(?:\.(\d+)| (nightly build \d+.*))\s*$/mi);
    if (!versionMatches) {
        result.messages.push({
            level: 'error',
            message: 'Errors: cant find prosody version.'
        });
        return result;
    }
    else {
        const major = versionMatches[1];
        const minor = versionMatches[2];
        const patch = versionMatches[3] ?? versionMatches[4];
        result.messages.push(`Prosody version is ${major}.${minor}.${patch}`);
        if (major !== '0' && minor !== '12') {
            result.messages.push({
                level: parseInt(minor) < 12 ? 'error' : 'warning',
                message: 'Warning: recommended Prosody version is 0.12.x'
            });
        }
    }
    try {
        const apiUrl = `http://localhost:${prosodyPort}/peertubelivechat_test/test-peertube-prosody`;
        const testResult = await got(apiUrl, {
            method: 'GET',
            headers: {
                authorization: 'Bearer ' + await (0, apikey_1.getAPIKey)(options),
                host: prosodyHost
            },
            responseType: 'json',
            resolveBodyOnly: true
        });
        if (testResult.ok === true) {
            result.messages.push('API Peertube -> Prosody is OK');
        }
        else {
            result.messages.push('API Peertube -> Prosody is KO. Response was: ' + JSON.stringify(testResult));
            return result;
        }
    }
    catch (error) {
        result.messages.push('Error when calling Prosody test api (test-peertube-prosody): ' + error);
        return result;
    }
    try {
        const apiUrl = `http://localhost:${prosodyPort}/peertubelivechat_test/test-prosody-peertube`;
        const testResult = await got(apiUrl, {
            method: 'GET',
            headers: {
                authorization: 'Bearer ' + await (0, apikey_1.getAPIKey)(options),
                host: prosodyHost
            },
            responseType: 'json',
            resolveBodyOnly: true
        });
        if (testResult.ok === true) {
            result.messages.push('API Prosody -> Peertube is OK');
        }
        else {
            result.messages.push({
                level: 'error',
                message: 'API Prosody -> Peertube is KO. Response was: ' + JSON.stringify(testResult),
                help: {
                    text: 'Check the troubleshooting documentation.',
                    url: (0, help_1.helpUrl)({
                        page: 'documentation/installation/troubleshooting'
                    })
                }
            });
            return result;
        }
    }
    catch (error) {
        result.messages.push('Error when calling Prosody test api (test-prosody-peertube): ' + error);
        return result;
    }
    const check = await (0, ctl_1.checkProsody)(options);
    result.debug.push({
        title: 'Prosody check',
        message: check
    });
    try {
        await fs.promises.access(prosodyErrorLogPath, fs.constants.R_OK);
        result.messages.push(`The prosody error log (${prosodyErrorLogPath}) exists`);
        const errorLogContent = await fs.promises.readFile(prosodyErrorLogPath, {
            encoding: 'utf-8'
        });
        let logLines = errorLogContent.split(/\r?\n/);
        if (logLines.length > 50) {
            logLines = logLines.slice(-50);
        }
        result.debug.push({
            title: 'Prosody error log (last 50 lines)',
            message: logLines.join('\n')
        });
    }
    catch (_err) {
    }
    result.ok = true;
    result.next = 'external-auth-custom-oidc';
    return result;
}
//# sourceMappingURL=prosody.js.map