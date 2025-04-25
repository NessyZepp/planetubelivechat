"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startProsodyLogRotate = startProsodyLogRotate;
exports.stopProsodyLogRotate = stopProsodyLogRotate;
const debug_1 = require("../debug");
const ctl_1 = require("./ctl");
const rotate = require('log-rotate');
let logRotate;
async function _rotate(options, path) {
    const p = new Promise((resolve) => {
        rotate(path, { count: 14, compress: false }, (err) => {
            if (err) {
                options.peertubeHelpers.logger.error('Failed to rotate file ' + path, err);
                resolve();
                return;
            }
            resolve();
        });
    });
    return p;
}
function startProsodyLogRotate(options, paths) {
    const logger = options.peertubeHelpers.logger;
    const checkInterval = (0, debug_1.debugNumericParameter)(options, 'logRotateCheckInterval', 60 * 1000, 60 * 60 * 1000);
    const rotateEvery = (0, debug_1.debugNumericParameter)(options, 'logRotateEvery', 2 * 60 * 1000, 24 * 60 * 60 * 1000);
    if (logRotate) {
        stopProsodyLogRotate(options);
    }
    logger.info('Starting Prosody log rotation');
    const timer = setInterval(() => {
        logger.debug('Checking if Prosody logs need to be rotated');
        if (!logRotate) {
            logger.error('Seems that we dont need to rotate Prosody logs, but the timer was called.');
            return;
        }
        if (logRotate.lastRotation + rotateEvery - 1000 > Date.now()) {
            logger.debug('To soon to rotate.');
            return;
        }
        logger.info('Rotating Prosody log files.');
        logRotate.lastRotation = Date.now();
        const p = Promise.all([
            _rotate(options, paths.log),
            _rotate(options, paths.error)
        ]);
        p.then(() => {
            (0, ctl_1.reloadProsody)(options).then(() => {
                logger.debug('Prosody reloaded');
            }, () => {
                logger.error('Prosody failed to reload');
            });
        }, (err) => {
            logger.error('Failed rotating logs', err);
        });
    }, checkInterval);
    logRotate = {
        timer,
        lastRotation: Date.now()
    };
}
function stopProsodyLogRotate(options) {
    const logger = options.peertubeHelpers.logger;
    if (logRotate === undefined) {
        return;
    }
    logger.info('Stoping Prosody log rotation');
    clearInterval(logRotate.timer);
}
//# sourceMappingURL=logrotate.js.map