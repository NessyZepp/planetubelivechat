"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagDebug = diagDebug;
const utils_1 = require("./utils");
const debug_1 = require("../../lib/debug");
async function diagDebug(test, options) {
    const result = (0, utils_1.newResult)(test);
    result.label = 'Test debug mode';
    result.ok = true;
    result.messages = [(0, debug_1.isDebugMode)(options) ? 'Debug mode is ON' : 'Debug mode is OFF'];
    result.next = 'webchat-video';
    return result;
}
//# sourceMappingURL=debug.js.map