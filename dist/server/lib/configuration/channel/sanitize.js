"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeChannelConfigurationOptions = sanitizeChannelConfigurationOptions;
const constants_1 = require("../../../../shared/lib/constants");
async function sanitizeChannelConfigurationOptions(_options, _channelId, data) {
    if (!_assertObjectType(data)) {
        throw new Error('Invalid data type');
    }
    const botData = data.bot ?? {};
    if (!_assertObjectType(botData)) {
        throw new Error('Invalid data.bot data type');
    }
    const slowModeData = data.slowMode ?? {};
    if (!_assertObjectType(slowModeData)) {
        throw new Error('Invalid data.slowMode data type');
    }
    slowModeData.duration ??= slowModeData.defaultDuration ?? 0;
    const moderationData = data.moderation ?? {};
    if (!_assertObjectType(moderationData)) {
        throw new Error('Invalid data.moderation data type');
    }
    moderationData.delay ??= 0;
    moderationData.anonymize ??= false;
    const mute = data.mute ?? {};
    if (!_assertObjectType(mute)) {
        throw new Error('Invalid data.mute data type');
    }
    mute.anonymous ??= false;
    botData.forbidSpecialChars ??= {
        enabled: false,
        reason: '',
        tolerance: constants_1.forbidSpecialCharsDefaultTolerance,
        applyToModerators: false
    };
    if (!_assertObjectType(botData.forbidSpecialChars)) {
        throw new Error('Invalid data.bot.forbidSpecialChars data type');
    }
    botData.noDuplicate ??= {
        enabled: false,
        reason: '',
        delay: constants_1.noDuplicateDefaultDelay,
        applyToModerators: false
    };
    if (!_assertObjectType(botData.noDuplicate)) {
        throw new Error('Invalid data.bot.noDuplicate data type');
    }
    let terms = data.terms ?? undefined;
    if (terms !== undefined && (typeof terms !== 'string')) {
        throw new Error('Invalid data.terms data type');
    }
    if (terms && terms.length > constants_1.channelTermsMaxLength) {
        throw new Error('data.terms value too long');
    }
    if (terms === '') {
        terms = undefined;
    }
    const result = {
        bot: {
            enabled: _readBoolean(botData, 'enabled'),
            nickname: _readSimpleInput(botData, 'nickname', true),
            forbiddenWords: await _readForbiddenWords(botData),
            forbidSpecialChars: await _readForbidSpecialChars(botData),
            noDuplicate: await _readNoDuplicate(botData),
            quotes: _readQuotes(botData),
            commands: _readCommands(botData)
        },
        slowMode: {
            duration: _readInteger(slowModeData, 'duration', 0, 1000)
        },
        mute: {
            anonymous: _readBoolean(mute, 'anonymous')
        },
        moderation: {
            delay: _readInteger(moderationData, 'delay', 0, 60),
            anonymize: _readBoolean(moderationData, 'anonymize')
        }
    };
    if (terms !== undefined) {
        result.terms = terms;
    }
    return result;
}
function _assertObjectType(data) {
    return !!data && (typeof data === 'object') && Object.keys(data).every(k => typeof k === 'string');
}
function _readBoolean(data, f) {
    if (!(f in data)) {
        return false;
    }
    if (typeof data[f] !== 'boolean') {
        throw new Error('Invalid data type for field ' + f);
    }
    return data[f];
}
function _readInteger(data, f, min, max) {
    if (!(f in data)) {
        throw new Error('Missing integer value for field ' + f);
    }
    const v = typeof data[f] === 'number' ? Math.trunc(data[f]) : parseInt(data[f]);
    if (isNaN(v)) {
        throw new Error('Invalid value type for field ' + f);
    }
    if (v < min) {
        throw new Error('Invalid value type (<min) for field ' + f);
    }
    if (v > max) {
        throw new Error('Invalid value type (>max) for field ' + f);
    }
    return v;
}
function _readSimpleInput(data, f, strict, noSpace) {
    if (!(f in data)) {
        return '';
    }
    if (typeof data[f] !== 'string') {
        throw new Error('Invalid data type for field ' + f);
    }
    let s = data[f].replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    if (strict) {
        s = s.replace(/[^\p{L}\p{N}\p{Z}_-]$/gu, '');
    }
    if (noSpace) {
        s = s.replace(/\s+/g, '');
    }
    return s;
}
function _readStringArray(data, f) {
    if (!(f in data)) {
        return [];
    }
    if (!Array.isArray(data[f])) {
        throw new Error('Invalid data type for field ' + f);
    }
    const result = [];
    for (const v of data[f]) {
        if (typeof v !== 'string') {
            throw new Error('Invalid data type in a value of field ' + f);
        }
        if (v === '' || /^\s+$/.test(v)) {
            continue;
        }
        result.push(v);
    }
    return result;
}
function _readMultiLineString(data, f) {
    if (!(f in data)) {
        return '';
    }
    if (typeof data[f] !== 'string') {
        throw new Error('Invalid data type for field ' + f);
    }
    const s = data[f].replace(/[\u0000-\u0009\u001B-\u001F\u007F-\u009F]/g, '');
    return s;
}
async function _readRegExpArray(data, f) {
    if (!(f in data)) {
        return [];
    }
    if (!Array.isArray(data[f])) {
        throw new Error('Invalid data type for field ' + f);
    }
    const result = [];
    for (const v of data[f]) {
        if (typeof v !== 'string') {
            throw new Error('Invalid data type in a value of field ' + f);
        }
        if (v === '' || /^\s+$/.test(v)) {
            continue;
        }
        try {
            async function _validate(v) {
                new RegExp(v);
            }
            await _validate(v);
        }
        catch (_err) {
            throw new Error('Invalid value in field ' + f);
        }
        result.push(v);
    }
    return result;
}
async function _readForbiddenWords(botData) {
    if (!Array.isArray(botData.forbiddenWords)) {
        throw new Error('Invalid forbiddenWords data');
    }
    const result = [];
    for (const fw of botData.forbiddenWords) {
        if (!_assertObjectType(fw)) {
            throw new Error('Invalid entry in botData.forbiddenWords');
        }
        const regexp = !!fw.regexp;
        let entries;
        if (regexp) {
            entries = await _readRegExpArray(fw, 'entries');
        }
        else {
            entries = _readStringArray(fw, 'entries');
        }
        const applyToModerators = _readBoolean(fw, 'applyToModerators');
        const label = fw.label ? _readSimpleInput(fw, 'label') : undefined;
        const reason = fw.reason ? _readSimpleInput(fw, 'reason') : undefined;
        const comments = fw.comments ? _readMultiLineString(fw, 'comments') : undefined;
        result.push({
            regexp,
            entries,
            applyToModerators,
            label,
            reason,
            comments
        });
    }
    return result;
}
async function _readForbidSpecialChars(botData) {
    if (!_assertObjectType(botData.forbidSpecialChars)) {
        throw new Error('Invalid forbidSpecialChars data');
    }
    const result = {
        enabled: _readBoolean(botData.forbidSpecialChars, 'enabled'),
        reason: _readSimpleInput(botData.forbidSpecialChars, 'reason'),
        tolerance: _readInteger(botData.forbidSpecialChars, 'tolerance', 0, constants_1.forbidSpecialCharsMaxTolerance),
        applyToModerators: _readBoolean(botData.forbidSpecialChars, 'applyToModerators')
    };
    return result;
}
async function _readNoDuplicate(botData) {
    if (!_assertObjectType(botData.noDuplicate)) {
        throw new Error('Invalid forbidSpecialChars data');
    }
    const result = {
        enabled: _readBoolean(botData.noDuplicate, 'enabled'),
        reason: _readSimpleInput(botData.noDuplicate, 'reason'),
        delay: _readInteger(botData.noDuplicate, 'delay', 0, constants_1.noDuplicateMaxDelay),
        applyToModerators: _readBoolean(botData.noDuplicate, 'applyToModerators')
    };
    return result;
}
function _readQuotes(botData) {
    if (!Array.isArray(botData.quotes)) {
        throw new Error('Invalid quotes data');
    }
    const result = [];
    for (const qs of botData.quotes) {
        if (!_assertObjectType(qs)) {
            throw new Error('Invalid entry in botData.quotes');
        }
        const messages = _readStringArray(qs, 'messages');
        const delay = _readInteger(qs, 'delay', 1, 6000);
        result.push({
            messages,
            delay
        });
    }
    return result;
}
function _readCommands(botData) {
    if (!Array.isArray(botData.commands)) {
        throw new Error('Invalid commands data');
    }
    const result = [];
    for (const cs of botData.commands) {
        if (!_assertObjectType(cs)) {
            throw new Error('Invalid entry in botData.commands');
        }
        const message = _readSimpleInput(cs, 'message');
        const command = _readSimpleInput(cs, 'command', false, true);
        result.push({
            message,
            command
        });
    }
    return result;
}
//# sourceMappingURL=sanitize.js.map