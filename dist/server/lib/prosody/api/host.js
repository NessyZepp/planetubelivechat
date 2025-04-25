"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCurrentProsody = setCurrentProsody;
exports.delCurrentProsody = delCurrentProsody;
exports.getCurrentProsody = getCurrentProsody;
let current;
function setCurrentProsody(host, port) {
    current = {
        host,
        port
    };
}
function delCurrentProsody() {
    current = undefined;
}
function getCurrentProsody() {
    if (!current) {
        return null;
    }
    return Object.assign({}, current);
}
//# sourceMappingURL=host.js.map