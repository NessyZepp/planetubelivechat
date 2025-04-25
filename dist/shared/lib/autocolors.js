"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAutoColorsAvailable = isAutoColorsAvailable;
exports.areAutoColorsValid = areAutoColorsValid;
const validateColor = require('validate-color').default;
function isAutoColorsAvailable(theme) {
    return theme === 'peertube';
}
function areAutoColorsValid(autocolors) {
    const errors = [];
    for (const k in autocolors) {
        const color = autocolors[k];
        if (!validateColor(color)) {
            errors.push(color);
        }
    }
    if (errors.length) {
        return errors;
    }
    return true;
}
//# sourceMappingURL=autocolors.js.map