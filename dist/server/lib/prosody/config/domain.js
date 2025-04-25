"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProsodyDomain = getProsodyDomain;
async function getProsodyDomain(options) {
    const url = options.peertubeHelpers.config.getWebserverUrl();
    const matches = url.match(/^https?:\/\/([^:/]*)(:\d+)?(\/|$)/);
    if (!matches) {
        throw new Error(`Cant get a domain name from url '${url}'`);
    }
    return matches[1];
}
//# sourceMappingURL=domain.js.map