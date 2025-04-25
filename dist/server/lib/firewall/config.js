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
exports.canEditFirewallConfig = canEditFirewallConfig;
exports.listModFirewallFiles = listModFirewallFiles;
exports.getModFirewallConfig = getModFirewallConfig;
exports.sanitizeModFirewallConfig = sanitizeModFirewallConfig;
exports.saveModFirewallConfig = saveModFirewallConfig;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const admin_firewall_1 = require("../../../shared/lib/admin-firewall");
async function canEditFirewallConfig(options) {
    const peertubeHelpers = options.peertubeHelpers;
    const logger = peertubeHelpers.logger;
    if (!peertubeHelpers.plugin) {
        return false;
    }
    const filepath = path.resolve(peertubeHelpers.plugin.getDataDirectoryPath(), 'disable_mod_firewall_editing');
    try {
        await fs.promises.readFile(filepath);
        return false;
    }
    catch (err) {
        if (('code' in err) && err.code === 'ENOENT') {
            return true;
        }
        logger.error(err);
        return false;
    }
}
async function listModFirewallFiles(options, dir, includeDisabled) {
    try {
        const files = (await fs.promises.readdir(dir, { withFileTypes: true })).filter(file => {
            if (!file.isFile()) {
                return false;
            }
            if (file.name.endsWith('.pfw') &&
                admin_firewall_1.firewallNameRegexp.test(file.name.substring(0, file.name.length - 4))) {
                return true;
            }
            if (includeDisabled &&
                file.name.endsWith('.pfw.disabled') &&
                admin_firewall_1.firewallNameRegexp.test(file.name.substring(0, file.name.length - 13))) {
                return true;
            }
            return false;
        });
        return files.map(f => path.join(dir, f.name)).sort();
    }
    catch (_err) {
        return [];
    }
}
async function getModFirewallConfig(options, dir) {
    const filePaths = await listModFirewallFiles(options, dir, true);
    const files = [];
    for (const filePath of filePaths) {
        const content = (await fs.promises.readFile(filePath)).toString();
        const name = path.basename(filePath).replace(/\.pfw(\.disabled)?$/, '');
        files.push({
            name,
            content,
            enabled: !filePath.endsWith('.disabled')
        });
    }
    const enabled = (await options.settingsManager.getSetting('prosody-firewall-enabled')) === true;
    return {
        enabled,
        files
    };
}
async function sanitizeModFirewallConfig(options, data) {
    if (typeof data !== 'object') {
        throw new Error('Invalid data type');
    }
    if (!Array.isArray(data.files)) {
        throw new Error('Invalid data.files');
    }
    if (data.files.length > admin_firewall_1.maxFirewallFiles) {
        throw new Error('Too many files');
    }
    const files = [];
    for (const entry of data.files) {
        if (typeof entry !== 'object') {
            throw new Error('Invalid data in data.files');
        }
        if (typeof entry.enabled !== 'boolean') {
            throw new Error('Invalid data in data.files (enabled)');
        }
        if (typeof entry.name !== 'string') {
            throw new Error('Invalid data in data.files (name)');
        }
        if (typeof entry.content !== 'string') {
            throw new Error('Invalid data in data.files (content)');
        }
        if (entry.name.length > admin_firewall_1.maxFirewallNameLength || !admin_firewall_1.firewallNameRegexp.test(entry.name)) {
            throw new Error('Invalid name in data.files');
        }
        if (entry.content.length > admin_firewall_1.maxFirewallFileSize) {
            throw new Error('File content too big in data.files');
        }
        files.push({
            enabled: entry.enabled,
            name: entry.name,
            content: entry.content
        });
    }
    const result = {
        enabled: !!data.enabled,
        files
    };
    return result;
}
async function saveModFirewallConfig(options, dir, config) {
    const logger = options.peertubeHelpers.logger;
    const previousFiles = await listModFirewallFiles(options, dir, true);
    logger.debug('[mod-firewall-lib] Creating the ' + dir + ' directory.');
    await fs.promises.mkdir(dir, { recursive: true });
    const seen = new Map();
    for (const f of config.files) {
        const filePath = path.join(dir, f.name + '.pfw' + (f.enabled ? '' : '.disabled'));
        logger.info('[mod-firewall-lib] Saving ' + filePath);
        await fs.promises.writeFile(filePath, f.content);
        seen.set(filePath, true);
    }
    for (const p of previousFiles) {
        if (seen.has(p)) {
            continue;
        }
        logger.info('[mod-firewall-lib] Deleting deprecated file ' + p);
        await fs.promises.rm(p);
    }
}
//# sourceMappingURL=config.js.map