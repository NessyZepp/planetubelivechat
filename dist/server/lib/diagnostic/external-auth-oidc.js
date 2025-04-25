"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagExternalAuthOIDC = diagExternalAuthOIDC;
const utils_1 = require("./utils");
const oidc_1 = require("../external-auth/oidc");
async function diagExternalAuthOIDC(test, _options, singletonType, next) {
    const result = (0, utils_1.newResult)(test);
    result.label = 'Test External Auth OIDC: ' + singletonType;
    result.next = next;
    try {
        const oidc = oidc_1.ExternalAuthOIDC.singleton(singletonType);
        if (oidc.isDisabledBySettings()) {
            result.ok = true;
            result.messages.push('Feature disabled in plugins settings.');
            return result;
        }
        result.messages.push('Discovery URL: ' + (oidc.getDiscoveryUrl() ?? 'undefined'));
        const oidcErrors = await oidc.check();
        if (oidcErrors.length) {
            result.messages.push({
                level: 'error',
                message: 'The ExternalAuthOIDC singleton got some errors:'
            });
            for (const oidcError of oidcErrors) {
                result.messages.push({
                    level: 'error',
                    message: oidcError
                });
            }
            return result;
        }
    }
    catch (err) {
        result.messages.push({
            level: 'error',
            message: 'Error while retrieving the ExternalAuthOIDC singleton:' + err
        });
        return result;
    }
    const oidc = oidc_1.ExternalAuthOIDC.singleton(singletonType);
    const oidcClient = await oidc.load();
    if (oidcClient) {
        result.messages.push('Discovery URL loaded: ' + JSON.stringify(oidcClient.issuer.metadata));
    }
    else {
        result.messages.push({
            level: 'error',
            message: 'Failed to load the Discovery URL.'
        });
        return result;
    }
    result.ok = true;
    result.messages.push('Configuration OK.');
    return result;
}
//# sourceMappingURL=external-auth-oidc.js.map