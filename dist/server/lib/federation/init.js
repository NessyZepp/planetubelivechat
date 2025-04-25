"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFederation = initFederation;
const outgoing_1 = require("./outgoing");
const incoming_1 = require("./incoming");
async function initFederation(options) {
    const logger = options.peertubeHelpers.logger;
    const registerHook = options.registerHook;
    logger.info('Registring federation hooks...');
    registerHook({
        target: 'filter:activity-pub.video.json-ld.build.result',
        handler: async (jsonld, context) => {
            return (0, outgoing_1.videoBuildJSONLD)(options, jsonld, context);
        }
    });
    registerHook({
        target: 'filter:activity-pub.activity.context.build.result',
        handler: async (jsonld) => {
            return (0, outgoing_1.videoContextBuildJSONLD)(options, jsonld);
        }
    });
    registerHook({
        target: 'action:activity-pub.remote-video.created',
        handler: async (params) => {
            return (0, incoming_1.readIncomingAPVideo)(options, params);
        }
    });
    registerHook({
        target: 'action:activity-pub.remote-video.updated',
        handler: async (params) => {
            return (0, incoming_1.readIncomingAPVideo)(options, params);
        }
    });
}
//# sourceMappingURL=init.js.map