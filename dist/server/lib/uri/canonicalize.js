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
exports.canonicalizePluginUri = canonicalizePluginUri;
const helpers_1 = require("../helpers");
const url = __importStar(require("url"));
const removeVersionRegex = new RegExp(/\/plugins\/livechat\//.source +
    helpers_1.pluginVersionWordBreakRegex.source +
    /\//.source);
function canonicalizePluginUri(options, path, canonicalizeOptions) {
    let uri;
    if (path.match(/^(http|ws)s?:\/\//)) {
        uri = new url.URL(path);
    }
    else {
        uri = new url.URL(path, options.peertubeHelpers.config.getWebserverUrl());
    }
    if (canonicalizeOptions?.protocol) {
        const currentProtocolSecure = uri.protocol === 'https:' || uri.protocol === 'wss:';
        if (canonicalizeOptions.protocol === 'http') {
            uri.protocol = currentProtocolSecure ? 'https' : 'http';
        }
        else if (canonicalizeOptions.protocol === 'ws') {
            uri.protocol = currentProtocolSecure ? 'wss' : 'ws';
        }
    }
    if (canonicalizeOptions?.removePluginVersion) {
        uri.pathname = uri.pathname.replace(removeVersionRegex, '/plugins/livechat/');
    }
    return uri.toString();
}
//# sourceMappingURL=canonicalize.js.map