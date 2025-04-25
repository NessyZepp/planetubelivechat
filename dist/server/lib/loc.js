"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loc = loc;
exports.loadLoc = loadLoc;
const path_1 = require("path");
const fs_1 = require("fs");
const locContent = new Map();
function loc(key) {
    return locContent.get(key) ?? key;
}
async function loadLoc() {
    const filePath = (0, path_1.resolve)(__dirname, '..', '..', 'languages', 'en.reference.json');
    if (!(0, fs_1.existsSync)(filePath)) {
        throw new Error(`File ${filePath} missing, can't load plugin loc strings`);
    }
    const content = await fs_1.promises.readFile(filePath, 'utf8');
    const json = JSON.parse(content ?? '{}');
    if (typeof json !== 'object') {
        throw new Error(`File ${filePath} invalid, can't load plugin loc strings`);
    }
    for (const k in json) {
        const v = json[k];
        if (typeof v === 'string') {
            locContent.set(k, v);
        }
    }
}
//# sourceMappingURL=loc.js.map