"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diag = diag;
const backend_1 = require("./backend");
const utils_1 = require("./utils");
const debug_1 = require("./debug");
const prosody_1 = require("./prosody");
const video_1 = require("./video");
const external_auth_oidc_1 = require("./external-auth-oidc");
const help_1 = require("../../../shared/lib/help");
async function diag(test, options) {
    let result;
    if (test === 'backend') {
        result = await (0, backend_1.diagBackend)(test, options);
    }
    else if (test === 'debug') {
        result = await (0, debug_1.diagDebug)(test, options);
    }
    else if (test === 'webchat-video') {
        result = await (0, video_1.diagVideo)(test, options);
    }
    else if (test === 'prosody') {
        result = await (0, prosody_1.diagProsody)(test, options);
    }
    else if (test === 'external-auth-custom-oidc') {
        result = await (0, external_auth_oidc_1.diagExternalAuthOIDC)(test, options, 'custom', 'external-auth-google-oidc');
    }
    else if (test === 'external-auth-google-oidc') {
        result = await (0, external_auth_oidc_1.diagExternalAuthOIDC)(test, options, 'google', 'external-auth-facebook-oidc');
    }
    else if (test === 'external-auth-facebook-oidc') {
        result = await (0, external_auth_oidc_1.diagExternalAuthOIDC)(test, options, 'facebook', 'everything-ok');
    }
    else if (test === 'everything-ok') {
        result = (0, utils_1.newResult)(test);
        result.label = 'Everything seems fine';
        result.messages = [{
                level: 'info',
                message: 'If you still encounter issues with the plugin, check this documentation page:',
                help: {
                    text: 'Plugin troubleshooting',
                    url: (0, help_1.helpUrl)({
                        page: 'documentation/installation/troubleshooting'
                    })
                }
            }];
        result.ok = true;
    }
    else {
        result = (0, utils_1.newResult)(test);
        result.messages.push('Unknown test');
    }
    return result;
}
//# sourceMappingURL=index.js.map