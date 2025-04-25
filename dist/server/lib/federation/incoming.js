"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readIncomingAPVideo = readIncomingAPVideo;
const storage_1 = require("./storage");
const sanitize_1 = require("./sanitize");
async function readIncomingAPVideo(options, { video, videoAPObject }) {
    let peertubeLiveChat = ('peertubeLiveChat' in videoAPObject) ? videoAPObject.peertubeLiveChat : false;
    peertubeLiveChat = (0, sanitize_1.sanitizePeertubeLiveChatInfos)(options, peertubeLiveChat, video.url);
    await (0, storage_1.storeVideoLiveChatInfos)(options, video, peertubeLiveChat);
    if (video.remote) {
        if (peertubeLiveChat !== false && peertubeLiveChat.xmppserver) {
            await (0, storage_1.storeRemoteServerInfos)(options, peertubeLiveChat.xmppserver);
        }
    }
}
//# sourceMappingURL=incoming.js.map