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
exports.fixRoomSubject = fixRoomSubject;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
async function fixRoomSubject(options, filePaths) {
    const logger = options.peertubeHelpers.logger;
    const doneFilePath = path.resolve(filePaths.dir, 'fix-room-done');
    if (fs.existsSync(doneFilePath)) {
        logger.debug('fixRoomSubject already runned.');
        return;
    }
    logger.info('Fixing Prosody room subjects...');
    const folders = fs.readdirSync(filePaths.data, { withFileTypes: true }).filter(file => {
        return file.isDirectory() && file.name.startsWith('room%2e');
    });
    folders.forEach(folder => {
        const configDir = path.resolve(filePaths.data, folder.name, 'config');
        if (!fs.existsSync(configDir)) {
            return;
        }
        const roomDataFiles = fs.readdirSync(configDir, { withFileTypes: true }).filter(file => {
            return file.isFile() && file.name.endsWith('.dat');
        });
        roomDataFiles.forEach(file => {
            logger.debug('Checking room ' + file.name + ' subject');
            const filepath = path.resolve(configDir, file.name);
            let content = fs.readFileSync(filepath).toString();
            if (content.includes('["subject_from"]') && !content.includes('["subject"]')) {
                logger.info('We must fix room ' + file.name + ' by removing subject_from');
                content = content.replace(/^\s*\["subject_from"\]\s*=.*;\s*$/gm, '');
                content = content.replace(/^\s*\["subject_time"\]\s*=.*;\s*$/gm, '');
                fs.writeFileSync(filepath, content);
            }
        });
    });
    fs.writeFileSync(doneFilePath, '');
}
//# sourceMappingURL=fix-room-subject.js.map