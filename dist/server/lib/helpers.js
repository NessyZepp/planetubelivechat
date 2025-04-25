"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginVersionWordBreakRegex = exports.pluginVersionRegexp = exports.pluginShortName = exports.pluginName = void 0;
exports.getBaseRouterRoute = getBaseRouterRoute;
exports.getBaseWebSocketRoute = getBaseWebSocketRoute;
exports.getBaseStaticRoute = getBaseStaticRoute;
exports.isUserAdmin = isUserAdmin;
exports.isUserAdminOrModerator = isUserAdminOrModerator;
exports.getUserNickname = getUserNickname;
const pluginVersionRegexp = /^\d+\.\d+\.\d+(?:-(?:rc|alpha|beta)\.\d+)?$/;
exports.pluginVersionRegexp = pluginVersionRegexp;
const pluginVersionWordBreakRegex = /\b\d+\.\d+\.\d+(?:-(?:rc|alpha|beta)\.\d+)?\b/;
exports.pluginVersionWordBreakRegex = pluginVersionWordBreakRegex;
const packagejson = require('../../../package.json');
const version = packagejson.version || '';
if (!pluginVersionRegexp.test(version)) {
    throw new Error('Incorrect version in package.json.');
}
const pluginName = packagejson.name || '';
exports.pluginName = pluginName;
if (!/^peertube-plugin-[-a-z]+$/.test(pluginName)) {
    throw new Error('Incorrect plugin name in package.json.');
}
const pluginShortName = pluginName.substring('peertube-plugin-'.length);
exports.pluginShortName = pluginShortName;
function getBaseRouterRoute(options) {
    if (!options.peertubeHelpers.plugin) {
        throw new Error('Missing peertubeHelpers.plugin, have you the correct Peertube version?');
    }
    return options.peertubeHelpers.plugin.getBaseRouterRoute();
}
function getBaseWebSocketRoute(options) {
    if (!options.peertubeHelpers.plugin) {
        throw new Error('Missing peertubeHelpers.plugin, have you the correct Peertube version?');
    }
    if (!options.peertubeHelpers.plugin.getBaseWebSocketRoute) {
        return undefined;
    }
    return options.peertubeHelpers.plugin.getBaseWebSocketRoute();
}
function getBaseStaticRoute(options) {
    if (!options.peertubeHelpers.plugin) {
        throw new Error('Missing peertubeHelpers.plugin, have you the correct Peertube version?');
    }
    return options.peertubeHelpers.plugin.getBaseStaticRoute();
}
async function isUserAdmin(options, res) {
    const user = await options.peertubeHelpers.user.getAuthUser(res);
    if (!user) {
        return false;
    }
    if (user.blocked) {
        return false;
    }
    if (user.role !== 0) {
        return false;
    }
    return true;
}
async function isUserAdminOrModerator(options, res) {
    const user = await options.peertubeHelpers.user.getAuthUser(res);
    if (!user) {
        return false;
    }
    if (user.blocked) {
        return false;
    }
    if (user.role !== 0 && user.role !== 1) {
        return false;
    }
    return true;
}
async function getUserNickname(options, user) {
    const peertubeHelpers = options.peertubeHelpers;
    const logger = peertubeHelpers.logger;
    if (user.Account?.name) {
        return user.Account.name;
    }
    logger.error('There is no Account.name on the user');
    return undefined;
}
//# sourceMappingURL=helpers.js.map