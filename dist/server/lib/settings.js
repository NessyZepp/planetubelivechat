"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSettings = initSettings;
const ctl_1 = require("./prosody/ctl");
const room_channel_1 = require("./room-channel");
const ctl_2 = require("./bots/ctl");
const oidc_1 = require("./external-auth/oidc");
const emojis_1 = require("./emojis");
const auth_1 = require("./prosody/auth");
const loc_1 = require("./loc");
const config_1 = require("./firewall/config");
const escapeHTML = require('escape-html');
async function initSettings(options) {
    const { peertubeHelpers, settingsManager } = options;
    const logger = peertubeHelpers.logger;
    initImportantNotesSettings(options);
    initChatSettings(options);
    initFederationSettings(options);
    initAuth(options);
    initExternalAuth(options);
    initAdvancedChannelCustomizationSettings(options);
    initChatBehaviourSettings(options);
    initThemingSettings(options);
    await initChatServerAdvancedSettings(options);
    await oidc_1.ExternalAuthOIDC.initSingletons(options);
    const loadOidcs = () => {
        const oidcs = oidc_1.ExternalAuthOIDC.allSingletons();
        for (const oidc of oidcs) {
            try {
                const type = oidc.type;
                oidc.isOk().then(() => {
                    logger.info(`Loading External Auth OIDC ${type}...`);
                    oidc.load().then(() => {
                        logger.info(`External Auth OIDC ${type} loaded`);
                    }, () => {
                        logger.error(`Loading the External Auth OIDC ${type} failed`);
                    });
                }, () => {
                    logger.info(`No valid External Auth OIDC ${type}, nothing loaded`);
                });
            }
            catch (err) {
                logger.error(err);
                continue;
            }
        }
    };
    loadOidcs();
    let currentProsodyRoomtype = (await settingsManager.getSettings(['prosody-room-type']))['prosody-room-type'];
    settingsManager.onSettingsChange(async (settings) => {
        await ctl_2.BotsCtl.destroySingleton();
        await ctl_2.BotsCtl.initSingleton(options);
        loadOidcs();
        await oidc_1.ExternalAuthOIDC.initSingletons(options);
        await emojis_1.Emojis.destroySingleton();
        await emojis_1.Emojis.initSingleton(options);
        auth_1.LivechatProsodyAuth.singleton().setUserTokensEnabled(!settings['livechat-token-disabled']);
        peertubeHelpers.logger.info('Saving settings, ensuring prosody is running');
        await (0, ctl_1.ensureProsodyRunning)(options);
        await ctl_2.BotsCtl.singleton().start();
        if (settings['prosody-room-type'] !== currentProsodyRoomtype) {
            peertubeHelpers.logger.info('Setting prosody-room-type has changed value, must rebuild room-channel infos');
            room_channel_1.RoomChannel.singleton().rebuildData().then(() => peertubeHelpers.logger.info('Room-channel info rebuild ok.'), (err) => peertubeHelpers.logger.error(err));
        }
        currentProsodyRoomtype = settings['prosody-room-type'];
    });
}
function initImportantNotesSettings({ registerSetting }) {
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('important_note_title')
    });
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('important_note_text')
    });
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('diagnostic')
    });
    if (process.arch !== 'x64' && process.arch !== 'x86_64' && process.arch !== 'arm64') {
        registerSetting({
            name: 'prosody-arch-warning',
            type: 'html',
            private: true,
            descriptionHTML: `<span class="peertube-plugin-livechat-warning">
It seems that your are using a ${process.arch} CPU,
which is not compatible with the plugin.
Please read
<a
  href="https://livingston.frama.io/peertube-plugin-livechat/documentation/installation/cpu_compatibility/"
  target="_blank"
>
  this page
</a> for a workaround.
</span>`
        });
    }
}
function initChatSettings({ registerSetting }) {
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('chat_title')
    });
    registerSetting({
        name: 'chat-terms',
        private: true,
        label: (0, loc_1.loc)('chat_terms_label'),
        type: 'input-textarea',
        default: '',
        descriptionHTML: (0, loc_1.loc)('chat_terms_description')
    });
    registerSetting({
        name: 'prosody-list-rooms',
        label: (0, loc_1.loc)('list_rooms_label'),
        type: 'html',
        descriptionHTML: (0, loc_1.loc)('list_rooms_description'),
        private: true
    });
}
function initFederationSettings({ registerSetting }) {
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('federation_description')
    });
    registerSetting({
        name: 'federation-no-remote-chat',
        label: (0, loc_1.loc)('federation_no_remote_chat_label'),
        descriptionHTML: (0, loc_1.loc)('federation_no_remote_chat_description'),
        type: 'input-checkbox',
        default: false,
        private: false
    });
    registerSetting({
        name: 'federation-dont-publish-remotely',
        label: (0, loc_1.loc)('federation_dont_publish_remotely_label'),
        descriptionHTML: (0, loc_1.loc)('federation_dont_publish_remotely_description'),
        type: 'input-checkbox',
        default: false,
        private: true
    });
}
function initAuth(options) {
    const registerSetting = options.registerSetting;
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('auth_description')
    });
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('experimental_warning')
    });
    registerSetting({
        name: 'livechat-token-disabled',
        label: (0, loc_1.loc)('livechat_token_disabled_label'),
        descriptionHTML: (0, loc_1.loc)('livechat_token_disabled_description'),
        type: 'input-checkbox',
        default: false,
        private: false
    });
}
function initExternalAuth(options) {
    const registerSetting = options.registerSetting;
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('external_auth_description')
    });
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('external_auth_custom_oidc_title')
    });
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('experimental_warning')
    });
    registerSetting({
        name: 'external-auth-custom-oidc',
        label: (0, loc_1.loc)('external_auth_custom_oidc_label'),
        descriptionHTML: (0, loc_1.loc)('external_auth_custom_oidc_description'),
        type: 'input-checkbox',
        default: false,
        private: true
    });
    registerSetting({
        type: 'html',
        name: 'external-auth-custom-oidc-redirect-uris-info',
        private: true,
        descriptionHTML: (0, loc_1.loc)('external_auth_oidc_redirect_uris_info_description')
    });
    registerSetting({
        type: 'html',
        name: 'external-auth-custom-oidc-redirect-uris',
        private: true,
        descriptionHTML: `<ul><li>${escapeHTML(oidc_1.ExternalAuthOIDC.redirectUrl(options, 'custom'))}</li></ul>`
    });
    registerSetting({
        name: 'external-auth-custom-oidc-button-label',
        label: (0, loc_1.loc)('external_auth_custom_oidc_button_label_label'),
        descriptionHTML: (0, loc_1.loc)('external_auth_custom_oidc_button_label_description'),
        type: 'input',
        default: '',
        private: true
    });
    registerSetting({
        name: 'external-auth-custom-oidc-discovery-url',
        label: (0, loc_1.loc)('external_auth_custom_oidc_discovery_url_label'),
        type: 'input',
        private: true
    });
    registerSetting({
        name: 'external-auth-custom-oidc-client-id',
        label: (0, loc_1.loc)('external_auth_oidc_client_id_label'),
        type: 'input',
        private: true
    });
    registerSetting({
        name: 'external-auth-custom-oidc-client-secret',
        label: (0, loc_1.loc)('external_auth_oidc_client_secret_label'),
        type: 'input-password',
        private: true
    });
    for (const provider of ['google', 'facebook']) {
        let redirectUrl;
        try {
            redirectUrl = oidc_1.ExternalAuthOIDC.redirectUrl(options, provider);
        }
        catch (err) {
            options.peertubeHelpers.logger.error('Cant load redirect url for provider ' + provider);
            options.peertubeHelpers.logger.error(err);
            continue;
        }
        registerSetting({
            name: 'external-auth-' + provider + '-oidc',
            label: (0, loc_1.loc)('external_auth_' + provider + '_oidc_label'),
            descriptionHTML: (0, loc_1.loc)('external_auth_' + provider + '_oidc_description'),
            type: 'input-checkbox',
            default: false,
            private: true
        });
        registerSetting({
            type: 'html',
            name: 'external-auth-' + provider + '-oidc-redirect-uris-info',
            private: true,
            descriptionHTML: (0, loc_1.loc)('external_auth_oidc_redirect_uris_info_description')
        });
        registerSetting({
            type: 'html',
            name: 'external-auth-' + provider + '-oidc-redirect-uris',
            private: true,
            descriptionHTML: `<ul><li>${escapeHTML(redirectUrl)}</li></ul>`
        });
        registerSetting({
            name: 'external-auth-' + provider + '-oidc-client-id',
            label: (0, loc_1.loc)('external_auth_oidc_client_id_label'),
            type: 'input',
            private: true
        });
        registerSetting({
            name: 'external-auth-' + provider + '-oidc-client-secret',
            label: (0, loc_1.loc)('external_auth_oidc_client_secret_label'),
            type: 'input-password',
            private: true
        });
    }
}
function initAdvancedChannelCustomizationSettings({ registerSetting }) {
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('configuration_description')
    });
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('experimental_warning')
    });
    registerSetting({
        name: 'disable-channel-configuration',
        label: (0, loc_1.loc)('disable_channel_configuration_label'),
        type: 'input-checkbox',
        default: false,
        private: false
    });
}
function initChatBehaviourSettings({ registerSetting }) {
    registerSetting({
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('chat_behaviour_description')
    });
    registerSetting({
        name: 'prosody-room-type',
        label: (0, loc_1.loc)('room_type_label'),
        type: 'select',
        descriptionHTML: (0, loc_1.loc)('room_type_description'),
        private: false,
        default: 'video',
        options: [
            { value: 'video', label: (0, loc_1.loc)('room_type_option_video') },
            { value: 'channel', label: (0, loc_1.loc)('room_type_option_channel') }
        ]
    });
    registerSetting({
        name: 'chat-auto-display',
        label: (0, loc_1.loc)('auto_display_label'),
        descriptionHTML: (0, loc_1.loc)('auto_display_description'),
        type: 'input-checkbox',
        default: true,
        private: false
    });
    registerSetting({
        name: 'chat-open-blank',
        label: (0, loc_1.loc)('open_blank_label'),
        descriptionHTML: (0, loc_1.loc)('open_blank_description'),
        private: false,
        type: 'input-checkbox',
        default: true
    });
    registerSetting({
        name: 'chat-share-url',
        label: (0, loc_1.loc)('share_url_label'),
        descriptionHTML: (0, loc_1.loc)('share_url_description'),
        private: false,
        type: 'select',
        default: 'owner',
        options: [
            { value: 'nobody', label: (0, loc_1.loc)('share_url_option_nobody') },
            { value: 'everyone', label: (0, loc_1.loc)('share_url_option_everyone') },
            { value: 'owner', label: (0, loc_1.loc)('share_url_option_owner') },
            { value: 'owner+moderators', label: (0, loc_1.loc)('share_url_option_owner_moderators') }
        ]
    });
    registerSetting({
        name: 'chat-per-live-video',
        label: (0, loc_1.loc)('per_live_video_label'),
        type: 'input-checkbox',
        default: true,
        descriptionHTML: (0, loc_1.loc)('per_live_video_description'),
        private: false
    });
    registerSetting({
        name: 'chat-per-live-video-warning',
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('per_live_video_warning_description')
    });
    registerSetting({
        name: 'chat-all-lives',
        label: (0, loc_1.loc)('all_lives_label'),
        type: 'input-checkbox',
        default: false,
        descriptionHTML: (0, loc_1.loc)('all_lives_description'),
        private: false
    });
    registerSetting({
        name: 'chat-all-non-lives',
        label: (0, loc_1.loc)('all_non_lives_label'),
        type: 'input-checkbox',
        default: false,
        descriptionHTML: (0, loc_1.loc)('all_non_lives_description'),
        private: false
    });
    registerSetting({
        name: 'chat-videos-list',
        label: (0, loc_1.loc)('videos_list_label'),
        type: 'input-textarea',
        default: '',
        descriptionHTML: (0, loc_1.loc)('videos_list_description'),
        private: false
    });
    registerSetting({
        name: 'chat-no-anonymous',
        label: (0, loc_1.loc)('no_anonymous_label'),
        type: 'input-checkbox',
        default: false,
        descriptionHTML: (0, loc_1.loc)('no_anonymous_description'),
        private: false
    });
    registerSetting({
        name: 'auto-ban-anonymous-ip',
        label: (0, loc_1.loc)('auto_ban_anonymous_ip_label'),
        type: 'input-checkbox',
        default: false,
        descriptionHTML: (0, loc_1.loc)('auto_ban_anonymous_ip_description'),
        private: true
    });
}
function initThemingSettings({ registerSetting }) {
    registerSetting({
        name: 'theming-advanced',
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('theming_advanced_description')
    });
    registerSetting({
        name: 'avatar-set',
        label: (0, loc_1.loc)('avatar_set_label'),
        descriptionHTML: (0, loc_1.loc)('avatar_set_description'),
        type: 'select',
        default: 'sepia',
        private: true,
        options: [
            { value: 'sepia', label: (0, loc_1.loc)('avatar_set_option_sepia') },
            { value: 'cat', label: (0, loc_1.loc)('avatar_set_option_cat') },
            { value: 'bird', label: (0, loc_1.loc)('avatar_set_option_bird') },
            { value: 'fenec', label: (0, loc_1.loc)('avatar_set_option_fenec') },
            { value: 'abstract', label: (0, loc_1.loc)('avatar_set_option_abstract') },
            { value: 'legacy', label: (0, loc_1.loc)('avatar_set_option_legacy') },
            { value: 'none', label: (0, loc_1.loc)('avatar_set_option_none') }
        ]
    });
    registerSetting({
        name: 'converse-theme',
        label: (0, loc_1.loc)('converse_theme_label'),
        type: 'select',
        default: 'peertube',
        private: false,
        options: [
            { value: 'peertube', label: (0, loc_1.loc)('converse_theme_option_peertube') },
            { value: 'default', label: (0, loc_1.loc)('converse_theme_option_default') },
            { value: 'cyberpunk', label: (0, loc_1.loc)('converse_theme_option_cyberpunk') }
        ],
        descriptionHTML: (0, loc_1.loc)('converse_theme_description')
    });
    registerSetting({
        name: 'converse-autocolors',
        label: (0, loc_1.loc)('autocolors_label'),
        type: 'input-checkbox',
        default: true,
        private: false,
        descriptionHTML: (0, loc_1.loc)('autocolors_description')
    });
    registerSetting({
        name: 'chat-style',
        label: (0, loc_1.loc)('chat_style_label'),
        type: 'input-textarea',
        default: '',
        descriptionHTML: (0, loc_1.loc)('chat_style_description'),
        private: false
    });
}
async function initChatServerAdvancedSettings(options) {
    const { registerSetting } = options;
    registerSetting({
        name: 'prosody-advanced',
        type: 'html',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_advanced_description')
    });
    registerSetting({
        name: 'chat-help-builtin-prosody',
        type: 'html',
        label: (0, loc_1.loc)('help_builtin_prosody_label'),
        descriptionHTML: (0, loc_1.loc)('help_builtin_prosody_description'),
        private: true
    });
    registerSetting({
        name: 'use-system-prosody',
        type: 'input-checkbox',
        label: (0, loc_1.loc)('system_prosody_label'),
        descriptionHTML: (0, loc_1.loc)('system_prosody_description'),
        private: true,
        default: false
    });
    registerSetting({
        name: 'disable-websocket',
        type: 'input-checkbox',
        label: (0, loc_1.loc)('disable_websocket_label'),
        descriptionHTML: (0, loc_1.loc)('disable_websocket_description'),
        private: true,
        default: false
    });
    registerSetting({
        name: 'prosody-port',
        label: (0, loc_1.loc)('prosody_port_label'),
        type: 'input',
        default: '52800',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_port_description')
    });
    registerSetting({
        name: 'prosody-peertube-uri',
        label: (0, loc_1.loc)('prosody_peertube_uri_label'),
        type: 'input',
        default: '',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_peertube_uri_description')
    });
    registerSetting({
        name: 'prosody-muc-log-by-default',
        label: (0, loc_1.loc)('prosody_muc_log_by_default_label'),
        type: 'input-checkbox',
        default: true,
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_muc_log_by_default_description')
    });
    registerSetting({
        name: 'prosody-muc-expiration',
        label: (0, loc_1.loc)('prosody_muc_expiration_label'),
        type: 'input',
        default: '1w',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_muc_expiration_description')
    });
    registerSetting({
        name: 'prosody-room-allow-s2s',
        label: (0, loc_1.loc)('prosody_room_allow_s2s_label'),
        type: 'input-checkbox',
        default: false,
        private: false,
        descriptionHTML: (0, loc_1.loc)('prosody_room_allow_s2s_description')
    });
    registerSetting({
        name: 'prosody-s2s-port',
        label: (0, loc_1.loc)('prosody_s2s_port_label'),
        type: 'input',
        default: '5269',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_s2s_port_description')
    });
    registerSetting({
        name: 'prosody-s2s-interfaces',
        label: (0, loc_1.loc)('prosody_s2s_interfaces_label'),
        type: 'input',
        default: '*, ::',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_s2s_interfaces_description')
    });
    registerSetting({
        name: 'prosody-certificates-dir',
        label: (0, loc_1.loc)('prosody_certificates_dir_label'),
        type: 'input',
        default: '',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_certificates_dir_description')
    });
    registerSetting({
        name: 'prosody-c2s',
        label: (0, loc_1.loc)('prosody_c2s_label'),
        type: 'input-checkbox',
        default: false,
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_c2s_description')
    });
    registerSetting({
        name: 'prosody-c2s-port',
        label: (0, loc_1.loc)('prosody_c2s_port_label'),
        type: 'input',
        default: '52822',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_c2s_port_description')
    });
    registerSetting({
        name: 'prosody-c2s-interfaces',
        label: (0, loc_1.loc)('prosody_c2s_interfaces_label'),
        type: 'input',
        default: '127.0.0.1, ::1',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_c2s_interfaces_description')
    });
    registerSetting({
        name: 'prosody-components',
        label: (0, loc_1.loc)('prosody_components_label'),
        type: 'input-checkbox',
        default: false,
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_components_description')
    });
    registerSetting({
        name: 'prosody-components-port',
        label: (0, loc_1.loc)('prosody_components_port_label'),
        type: 'input',
        default: '53470',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_components_port_description')
    });
    registerSetting({
        name: 'prosody-components-interfaces',
        label: (0, loc_1.loc)('prosody_components_interfaces_label'),
        type: 'input',
        default: '127.0.0.1, ::1',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_components_interfaces_description')
    });
    registerSetting({
        name: 'prosody-components-list',
        label: (0, loc_1.loc)('prosody_components_list_label'),
        type: 'input-textarea',
        default: '',
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_components_list_description')
    });
    registerSetting({
        name: 'prosody-firewall-enabled',
        label: (0, loc_1.loc)('prosody_firewall_label'),
        type: 'input-checkbox',
        default: false,
        private: true,
        descriptionHTML: (0, loc_1.loc)('prosody_firewall_description')
    });
    if (await (0, config_1.canEditFirewallConfig)(options)) {
        registerSetting({
            type: 'html',
            name: 'prosody-firewall-configure-button',
            private: true,
            descriptionHTML: (0, loc_1.loc)('prosody_firewall_configure_button')
        });
    }
}
//# sourceMappingURL=settings.js.map