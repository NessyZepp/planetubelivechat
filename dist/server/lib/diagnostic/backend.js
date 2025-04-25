"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagBackend = diagBackend;
const utils_1 = require("./utils");
async function diagBackend(test, _options) {
    const result = (0, utils_1.newResult)(test);
    result.label = 'Backend connection';
    result.ok = true;
    result.next = 'debug';
    return result;
}
//# sourceMappingURL=backend.js.map