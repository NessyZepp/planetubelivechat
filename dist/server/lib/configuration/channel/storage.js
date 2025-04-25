"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChannelConfigurationOptions = getChannelConfigurationOptions;
exports.getDefaultChannelConfigurationOptions = getDefaultChannelConfigurationOptions;
exports.channelConfigurationOptionsToBotRoomConf = channelConfigurationOptionsToBotRoomConf;
exports.storeChannelConfigurationOptions = storeChannelConfigurationOptions;
const room_channel_1 = require("../../room-channel");
const sanitize_1 = require("../../configuration/channel/sanitize");
const constants_1 = require("../../../../shared/lib/constants");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function getChannelConfigurationOptions(options, channelId) {
    const logger = options.peertubeHelpers.logger;
    const filePath = _getFilePath(options, channelId);
    if (!fs.existsSync(filePath)) {
        logger.debug('No stored data for channel, returning null');
        return null;
    }
    const content = await fs.promises.readFile(filePath, {
        encoding: 'utf-8'
    });
    const sanitized = await (0, sanitize_1.sanitizeChannelConfigurationOptions)(options, channelId, JSON.parse(content));
    return sanitized;
}
function getDefaultChannelConfigurationOptions(_options) {
    return {
        bot: {
            enabled: false,
            nickname: 'Sepia',
            forbiddenWords: [],
            forbidSpecialChars: {
                enabled: false,
                reason: '',
                tolerance: constants_1.forbidSpecialCharsDefaultTolerance,
                applyToModerators: false
            },
            noDuplicate: {
                enabled: false,
                reason: '',
                delay: constants_1.noDuplicateDefaultDelay,
                applyToModerators: false
            },
            quotes: [],
            commands: []
        },
        slowMode: {
            duration: 0
        },
        mute: {
            anonymous: false
        },
        moderation: {
            delay: 0,
            anonymize: false
        },
        terms: undefined
    };
}
async function storeChannelConfigurationOptions(options, channelId, channelConfigurationOptions) {
    const filePath = _getFilePath(options, channelId);
    if (!fs.existsSync(filePath)) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    const jsonContent = JSON.stringify(channelConfigurationOptions);
    await fs.promises.writeFile(filePath, jsonContent, {
        encoding: 'utf-8'
    });
    room_channel_1.RoomChannel.singleton().refreshChannelConfigurationOptions(channelId);
}
function channelConfigurationOptionsToBotRoomConf(options, channelConfigurationOptions, previousRoomConf) {
    const handlersIds = new Map();
    const handlers = [];
    channelConfigurationOptions.bot.forbiddenWords.forEach((v, i) => {
        const id = 'forbidden_words_' + i.toString();
        handlersIds.set(id, true);
        handlers.push(_getForbiddenWordsHandler(id, v));
    });
    if (channelConfigurationOptions.bot.forbidSpecialChars.enabled) {
        const id = 'forbid_special_chars';
        handlersIds.set(id, true);
        handlers.push(_getForbidSpecialCharsHandler(id, channelConfigurationOptions.bot.forbidSpecialChars));
    }
    if (channelConfigurationOptions.bot.noDuplicate.enabled) {
        const id = 'no_duplicate';
        handlersIds.set(id, true);
        handlers.push(_getNoDuplicateHandler(id, channelConfigurationOptions.bot.noDuplicate));
    }
    channelConfigurationOptions.bot.quotes.forEach((v, i) => {
        const id = 'quote_' + i.toString();
        handlersIds.set(id, true);
        handlers.push(_getQuotesHandler(id, v));
    });
    channelConfigurationOptions.bot.commands.forEach((v, i) => {
        const id = 'command_' + i.toString();
        handlersIds.set(id, true);
        handlers.push(_getCommandsHandler(id, v));
    });
    if (previousRoomConf) {
        for (const handler of previousRoomConf.handlers) {
            if (!handlersIds.has(handler.id)) {
                const disabledHandler = JSON.parse(JSON.stringify(handler));
                disabledHandler.enabled = false;
                handlers.push(disabledHandler);
            }
        }
    }
    const roomConf = {
        enabled: channelConfigurationOptions.bot.enabled,
        handlers
    };
    if (channelConfigurationOptions.bot.nickname && channelConfigurationOptions.bot.nickname !== '') {
        roomConf.nick = channelConfigurationOptions.bot.nickname;
    }
    return roomConf;
}
function _getForbiddenWordsHandler(id, forbiddenWords) {
    const handler = {
        type: 'moderate',
        id,
        enabled: false,
        options: {
            rules: []
        }
    };
    if (forbiddenWords.entries.length === 0) {
        return handler;
    }
    handler.enabled = true;
    const rule = {
        name: id
    };
    if (forbiddenWords.regexp) {
        rule.regexp = '(?:' + forbiddenWords.entries.join(')|(?:') + ')';
    }
    else {
        rule.regexp = '(?:' + forbiddenWords.entries.map(s => {
            s = _stringToWordRegexp(s);
            if (/^\w/.test(s)) {
                s = '\\b' + s;
            }
            if (/\w$/.test(s)) {
                s = s + '\\b';
            }
            return s;
        }).join(')|(?:') + ')';
    }
    if (forbiddenWords.reason) {
        rule.reason = forbiddenWords.reason;
    }
    handler.options.rules.push(rule);
    handler.options.applyToModerators = !!forbiddenWords.applyToModerators;
    return handler;
}
function _getForbidSpecialCharsHandler(id, forbidSpecialChars) {
    const handler = {
        type: 'moderate',
        id,
        enabled: true,
        options: {
            rules: []
        }
    };
    let regexp = '[^' +
        '\\s\\p{Letter}\\p{Number}\\p{Punctuation}\\p{Currency_Symbol}\\p{Emoji}\\p{Emoji_Component}\\p{Emoji_Modifier}' +
        ']';
    if (forbidSpecialChars.tolerance > 0) {
        const a = [];
        for (let i = 0; i <= forbidSpecialChars.tolerance; i++) {
            a.push(regexp);
        }
        regexp = a.join('.*');
    }
    const rule = {
        name: id,
        regexp,
        modifiers: 'us',
        reason: forbidSpecialChars.reason
    };
    handler.options.rules.push(rule);
    handler.options.applyToModerators = !!forbidSpecialChars.applyToModerators;
    return handler;
}
function _getNoDuplicateHandler(id, noDuplicate) {
    const handler = {
        type: 'no-duplicate',
        id,
        enabled: true,
        options: {
            reason: noDuplicate.reason,
            delay: noDuplicate.delay,
            applyToModerators: !!noDuplicate.applyToModerators
        }
    };
    return handler;
}
function _getQuotesHandler(id, quotes) {
    const handler = {
        type: 'quotes_random',
        id,
        enabled: false,
        options: {
            quotes: [],
            delay: 5 * 60
        }
    };
    if (quotes.messages.length === 0) {
        return handler;
    }
    handler.enabled = true;
    handler.options.quotes = quotes.messages;
    handler.options.delay = quotes.delay;
    return handler;
}
function _getCommandsHandler(id, command) {
    const handler = {
        type: 'command_say',
        id,
        enabled: false,
        options: {
            quotes: [],
            command: 'undefined'
        }
    };
    if (!command.message || command.message === '') {
        return handler;
    }
    handler.enabled = true;
    handler.options.command = command.command;
    handler.options.quotes = [command.message];
    return handler;
}
const stringToWordRegexpSpecials = [
    '-', '[', ']',
    '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\', '^', '$', '|'
];
const stringToWordRegexp = RegExp('[' + stringToWordRegexpSpecials.join('\\') + ']', 'g');
function _stringToWordRegexp(s) {
    return s.replace(stringToWordRegexp, '\\$&');
}
function _getFilePath(options, channelId) {
    channelId = parseInt(channelId.toString());
    if (isNaN(channelId)) {
        throw new Error(`Invalid channelId: ${channelId}`);
    }
    return path.resolve(options.peertubeHelpers.plugin.getDataDirectoryPath(), 'channelConfigurationOptions', channelId.toString() + '.json');
}
//# sourceMappingURL=storage.js.map