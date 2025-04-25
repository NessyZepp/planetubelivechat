"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newResult = newResult;
function newResult(test) {
    return {
        test,
        ok: false,
        messages: [],
        debug: [],
        next: null
    };
}
//# sourceMappingURL=utils.js.map