"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAPIKey = getAPIKey;
async function getAPIKey({ storageManager }) {
    let value = await storageManager.getData('APIKEY');
    if (!value) {
        value = Math.random().toString(36).slice(2, 12);
        await storageManager.storeData('APIKEY', value);
    }
    return value;
}
//# sourceMappingURL=apikey.js.map