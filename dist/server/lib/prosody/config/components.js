"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExternalComponents = parseExternalComponents;
function parseExternalComponents(s, prosodyDomain) {
    if (!s) {
        return [];
    }
    let lines = s.split('\n');
    lines = lines.map(line => {
        return line.replace(/#.*$/, '')
            .replace(/^\s+/, '')
            .replace(/\s+$/, '');
    });
    lines = lines.filter(line => line !== '');
    const r = [];
    for (const line of lines) {
        const matches = line.match(/^([\w.]+)\s*:\s*(\w+)$/);
        if (matches) {
            let name = matches[1];
            if (!name.includes('.')) {
                name = name + '.' + prosodyDomain;
            }
            r.push({
                name,
                secret: matches[2]
            });
        }
    }
    return r;
}
//# sourceMappingURL=components.js.map