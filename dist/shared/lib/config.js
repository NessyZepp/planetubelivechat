"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConfigUUIDs = parseConfigUUIDs;
function parseConfigUUIDs(s) {
    if (!s) {
        return [];
    }
    let a = s.split('\n');
    a = a.map(line => {
        return line.replace(/#.*$/, '')
            .replace(/^\s+/, '')
            .replace(/\s+$/, '');
    });
    return a.filter(line => line !== '');
}
//# sourceMappingURL=config.js.map