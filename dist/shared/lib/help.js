"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpUrl = helpUrl;
function helpUrl(options) {
    let url = 'https://livingston.frama.io/peertube-plugin-livechat/';
    if (options.lang && /^[a-zA-Z_-]+$/.test(options.lang)) {
        url = url + options.lang + '/';
    }
    if (options.page && /^[\w/-]+$/.test(options.page)) {
        url = url + options.page + '/';
    }
    return url;
}
//# sourceMappingURL=help.js.map