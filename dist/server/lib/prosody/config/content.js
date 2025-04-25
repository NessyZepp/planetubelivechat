"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProsodyConfigContent = void 0;
const bot_1 = require("../../configuration/bot");
const loc_1 = require("../../loc");
const os_1 = require("os");
class ConfigEntryValueMultiLineString extends String {
    serialize() {
        const s = this.toString();
        let i = 0;
        while (true) {
            const opening = '[' + '='.repeat(i) + '[';
            const closing = ']' + '='.repeat(i) + ']';
            if (!s.includes(opening) && !s.includes(closing)) {
                break;
            }
            i++;
        }
        return '[' + '='.repeat(i) + '[' + s + ']' + '='.repeat(i) + ']';
    }
}
function writeValue(value) {
    if (value instanceof ConfigEntryValueMultiLineString) {
        return value.serialize() + ';\n';
    }
    if (typeof value === 'boolean') {
        return value.toString() + ';\n';
    }
    if (typeof value === 'string') {
        return '"' + value.replace(/"/g, '\\"') + '"' + ';\n';
    }
    if (typeof value === 'number') {
        return value.toString() + ';\n';
    }
    if (Array.isArray(value)) {
        let s = '{\n';
        for (let i = 0; i < value.length; i++) {
            s += '  ' + writeValue(value[i]);
        }
        s += '};\n';
        return s;
    }
    throw new Error(`Don't know how to handle this value: ${value}`);
}
class ProsodyConfigBlock {
    constructor(prefix) {
        this.prefix = prefix;
        this.entries = new Map();
    }
    set(name, value) {
        this.entries.set(name, value);
    }
    add(name, value, allowDuplicate) {
        if (!this.entries.has(name)) {
            this.entries.set(name, []);
        }
        let entry = this.entries.get(name) ?? [];
        if (!Array.isArray(entry)) {
            entry = [entry];
        }
        if (!allowDuplicate && entry.includes(value)) {
            return;
        }
        entry.push(value);
        this.entries.set(name, entry);
    }
    remove(name, value) {
        if (!this.entries.has(name)) {
            return;
        }
        let entry = this.entries.get(name) ?? [];
        if (!Array.isArray(entry)) {
            entry = [entry];
        }
        entry = entry.filter(v => v !== value);
        this.entries.set(name, entry);
    }
    write() {
        let content = '';
        this.entries.forEach((value, key) => {
            content += this.prefix + key + ' = ' + writeValue(value);
        });
        return content;
    }
}
class ProsodyConfigGlobal extends ProsodyConfigBlock {
    constructor() {
        super('');
    }
}
class ProsodyConfigVirtualHost extends ProsodyConfigBlock {
    constructor(name) {
        super('  ');
        this.name = name;
    }
    write() {
        return `VirtualHost "${this.name}"\n` + super.write();
    }
}
class ProsodyConfigComponent extends ProsodyConfigBlock {
    constructor(name, type) {
        super('  ');
        this.type = type;
        this.name = name;
    }
    write() {
        if (this.type !== undefined) {
            return `Component "${this.name}" "${this.type}"\n` + super.write();
        }
        return `Component "${this.name}"\n` + super.write();
    }
}
class ProsodyConfigContent {
    constructor(paths, prosodyDomain, chatTerms) {
        this.externalComponents = [];
        this.paths = paths;
        this.global = new ProsodyConfigGlobal();
        this.log = '';
        this.prosodyDomain = prosodyDomain;
        this.muc = new ProsodyConfigComponent('room.' + prosodyDomain, 'muc');
        this.global.set('daemonize', false);
        this.global.set('allow_registration', false);
        this.global.set('admins', []);
        this.global.set('prosody_user', (0, os_1.userInfo)().username);
        this.global.set('pidfile', this.paths.pid);
        this.global.set('plugin_paths', [this.paths.modules]);
        this.global.set('data_path', this.paths.data);
        this.global.set('storage', 'internal');
        this.global.set('modules_enabled', [
            'roster',
            'saslauth',
            'carbons',
            'version',
            'uptime',
            'ping',
            'posix',
            'disco'
        ]);
        this.global.set('modules_disabled', [
            's2s'
        ]);
        this.global.set('consider_bosh_secure', false);
        this.global.set('consider_websocket_secure', false);
        if (this.paths.certs) {
            this.global.set('certificates', this.paths.certs);
        }
        this.muc.set('admins', []);
        this.muc.set('muc_room_locking', false);
        this.muc.set('muc_tombstones', false);
        this.muc.set('muc_room_default_language', 'en');
        this.muc.set('muc_room_default_public', false);
        this.muc.set('muc_room_default_persistent', false);
        this.muc.set('muc_room_default_members_only', false);
        this.muc.set('muc_room_default_moderated', false);
        this.muc.set('muc_room_default_public_jids', false);
        this.muc.set('muc_room_default_change_subject', false);
        this.muc.set('muc_room_default_history_length', 20);
        this.muc.add('modules_enabled', 'muc_slow_mode');
        this.muc.set('slow_mode_duration_form_position', 120);
        this.muc.add('modules_enabled', 'pubsub_peertubelivechat');
        this.muc.add('modules_enabled', 'muc_peertubelivechat_roles');
        this.muc.add('modules_enabled', 'muc_peertubelivechat_announcements');
        this.muc.add('modules_enabled', 'muc_peertubelivechat_terms');
        this.muc.set('muc_terms_service_nickname', 'Peertube');
        if (chatTerms) {
            this.muc.set('muc_terms_global', new ConfigEntryValueMultiLineString(chatTerms));
        }
        this.muc.add('modules_enabled', 'muc_moderation_delay');
        this.muc.set('moderation_delay_form_position', 118);
        this.muc.add('modules_enabled', 'muc_anonymize_moderation_actions');
        this.muc.set('anonymize_moderation_actions_form_position', 117);
        this.muc.add('modules_enabled', 'muc_mam_search');
    }
    useAnonymous(autoBanIP) {
        this.anon = new ProsodyConfigVirtualHost('anon.' + this.prosodyDomain);
        this.anon.set('authentication', 'anonymous');
        this.anon.set('modules_enabled', ['ping']);
        this.anon.set('modules_disabled', [
            'carbons'
        ]);
        if (autoBanIP) {
            this.anon.add('modules_enabled', 'muc_ban_ip');
        }
    }
    useExternal(apikey) {
        this.external = new ProsodyConfigVirtualHost('external.' + this.prosodyDomain);
        this.external.set('modules_enabled', [
            'ping',
            'http',
            'vcard',
            'http_peertubelivechat_manage_users'
        ]);
        this.external.set('peertubelivechat_manage_users_apikey', apikey);
    }
    useHttpAuthentication(url) {
        this.authenticated = new ProsodyConfigVirtualHost(this.prosodyDomain);
        this.authenticated.set('authentication', 'http');
        this.authenticated.set('modules_enabled', ['ping']);
        this.authenticated.set('http_auth_url', url);
    }
    usePeertubeBoshAndWebsocket(prosodyDomain, port, publicServerUrl, useWS, multiplexing) {
        this.global.set('c2s_require_encryption', false);
        this.global.set('interfaces', ['127.0.0.1', '::1']);
        this.global.set('c2s_ports', []);
        this.global.set('c2s_interfaces', ['127.0.0.1', '::1']);
        this.global.set('s2s_ports', []);
        this.global.set('s2s_interfaces', ['127.0.0.1', '::1']);
        if (!multiplexing) {
            this.global.set('http_ports', [port]);
        }
        else {
            this.global.add('modules_enabled', 'net_multiplex');
            this.global.set('ports', [port]);
            this.global.set('http_ports', []);
        }
        this.global.set('http_interfaces', ['127.0.0.1', '::1']);
        this.global.set('https_ports', []);
        this.global.set('https_interfaces', ['127.0.0.1', '::1']);
        this.global.set('trusted_proxies', ['127.0.0.1', '::1']);
        this.global.set('consider_bosh_secure', true);
        if (useWS) {
            this.global.set('consider_websocket_secure', true);
            this.global.set('c2s_close_timeout', 29);
        }
        if (this.anon) {
            this.anon.set('allow_anonymous_s2s', false);
            this.anon.add('modules_enabled', 'http');
            this.anon.add('modules_enabled', 'bosh');
            if (useWS) {
                this.anon.add('modules_enabled', 'websocket');
            }
            this.anon.set('http_host', prosodyDomain);
            this.anon.set('http_external_url', 'http://' + prosodyDomain);
        }
        this.muc.set('restrict_room_creation', 'local');
        this.muc.set('http_host', prosodyDomain);
        this.muc.set('http_external_url', 'http://' + prosodyDomain);
        if (this.authenticated) {
            this.authenticated.set('allow_anonymous_s2s', false);
            this.authenticated.add('modules_enabled', 'http');
            this.authenticated.add('modules_enabled', 'bosh');
            if (useWS) {
                this.authenticated.add('modules_enabled', 'websocket');
            }
            this.authenticated.set('http_host', prosodyDomain);
            this.authenticated.set('http_external_url', 'http://' + prosodyDomain);
        }
        if (this.external) {
            this.external.set('allow_anonymous_s2s', false);
            this.external.add('modules_enabled', 'http');
            this.external.add('modules_enabled', 'bosh');
            if (useWS) {
                this.external.add('modules_enabled', 'websocket');
            }
            this.external.set('http_host', prosodyDomain);
            this.external.set('http_external_url', 'http://' + prosodyDomain);
        }
    }
    useC2S(c2sPort, c2sInterfaces) {
        this.global.set('c2s_ports', [c2sPort]);
        this.global.set('c2s_interfaces', c2sInterfaces);
    }
    useS2S(s2sPort, s2sInterfaces, publicServerUrl, serverInfosDir) {
        if (s2sPort !== null) {
            this.global.set('s2s_ports', [s2sPort]);
        }
        else {
            this.global.set('s2s_ports', []);
        }
        if (s2sInterfaces !== null) {
            this.global.set('s2s_interfaces', s2sInterfaces);
        }
        else {
            this.global.set('s2s_interfaces', []);
        }
        this.global.set('s2s_secure_auth', false);
        this.global.remove('modules_disabled', 's2s');
        this.global.add('modules_enabled', 's2s');
        this.global.add('modules_enabled', 'tls');
        this.global.add('modules_enabled', 's2s_peertubelivechat');
        this.global.set('peertubelivechat_server_infos_path', serverInfosDir);
        this.global.set('peertubelivechat_instance_url', publicServerUrl);
        this.global.add('modules_enabled', 'websocket_s2s_peertubelivechat');
        this.global.set('websocket_s2s_ping_interval', 55);
        this.muc.add('modules_enabled', 'websocket_s2s_peertubelivechat');
        this.global.set('s2s_peertubelivechat_no_outgoing_directs2s_to_peertube', s2sPort === null);
        this.muc.add('modules_enabled', 'dialback');
        this.authenticated?.add('modules_enabled', 'dialback');
        this.external?.add('modules_enabled', 'dialback');
    }
    useExternalComponents(componentsPort, componentsInterfaces, components) {
        this.global.set('component_ports', [componentsPort]);
        if (componentsInterfaces !== null) {
            this.global.set('component_interfaces', componentsInterfaces);
        }
        else {
            this.global.set('component_interfaces', []);
        }
        for (const component of components) {
            const c = new ProsodyConfigComponent(component.name);
            c.set('component_secret', component.secret);
            c.set('disco_hidden', true);
            this.externalComponents.push(c);
        }
    }
    useMucHttpDefault(url) {
        this.muc.add('modules_enabled', 'muc_http_defaults');
        this.muc.set('muc_create_api_url', url);
        this.muc.set('restrict_room_creation', false);
    }
    useMam(logByDefault, logExpiration) {
        this.muc.add('modules_enabled', 'muc_mam');
        this.muc.set('muc_log_by_default', !!logByDefault);
        this.muc.set('muc_log_presences', true);
        this.muc.set('log_all_rooms', false);
        this.muc.set('muc_log_expires_after', logExpiration.value);
        const defaultCleanupInterval = 4 * 60 * 60;
        if (logExpiration.type === 'seconds' && logExpiration.seconds && logExpiration.seconds < defaultCleanupInterval) {
            this.muc.set('muc_log_cleanup_interval', logExpiration.seconds);
        }
        else {
            this.muc.set('muc_log_cleanup_interval', defaultCleanupInterval);
        }
        this.muc.add('modules_enabled', 'muc_moderation');
    }
    useDefaultPersistent() {
        this.muc.set('muc_room_default_persistent', true);
    }
    useManageRoomsApi(apikey) {
        this.muc.add('modules_enabled', 'http_peertubelivechat_manage_rooms');
        this.muc.set('peertubelivechat_manage_rooms_apikey', apikey);
    }
    useTestModule(prosodyApikey, apiurl) {
        this.muc.add('modules_enabled', 'http_peertubelivechat_test');
        this.muc.set('peertubelivechat_test_apikey', prosodyApikey);
        this.muc.set('peertubelivechat_test_peertube_api_url', apiurl);
    }
    usePeertubeVCards(peertubeUrl) {
        if (this.authenticated) {
            this.authenticated.add('modules_enabled', 'vcard_peertubelivechat');
            this.authenticated.set('peertubelivechat_vcard_peertube_url', peertubeUrl);
        }
    }
    useAnonymousRandomVCards(avatarPath, avatarFiles) {
        if (this.anon) {
            this.anon.add('modules_enabled', 'random_vcard_peertubelivechat');
            this.anon.set('peertubelivechat_random_vcard_avatars_path', avatarPath);
            this.anon.set('peertubelivechat_random_vcard_avatars_files', avatarFiles);
        }
    }
    useBotsVirtualHost(botAvatarPath, botAvatarFiles) {
        this.bot = new ProsodyConfigVirtualHost('bot.' + this.prosodyDomain);
        this.bot.set('modules_enabled', ['ping', 'tls']);
        this.bot.set('authentication', 'peertubelivechat_bot');
        this.bot.add('modules_enabled', 'random_vcard_peertubelivechat');
        this.bot.set('peertubelivechat_random_vcard_avatars_path', botAvatarPath);
        this.bot.set('peertubelivechat_random_vcard_avatars_files', botAvatarFiles);
        this.muc.add('admins', bot_1.BotConfiguration.singleton().moderationBotJID());
        const configurationPaths = bot_1.BotConfiguration.singleton().configurationPaths();
        if (configurationPaths.moderation?.globalDir) {
            this.bot.set('livechat_bot_conf_folder', configurationPaths.moderation.globalDir);
        }
    }
    usePoll() {
        this.muc.add('modules_enabled', 'muc_poll');
        this.muc.set('poll_string_over', (0, loc_1.loc)('poll_is_over'));
        this.muc.set('poll_string_invalid_choice', (0, loc_1.loc)('poll_choice_invalid'));
        this.muc.set('poll_string_anonymous_vote_ok', (0, loc_1.loc)('poll_anonymous_vote_ok'));
        this.muc.set('poll_string_vote_instructions', (0, loc_1.loc)('poll_vote_instructions_xmpp'));
    }
    useModFirewall(files) {
        this.global.add('modules_enabled', 'firewall');
        this.global.set('firewall_scripts', files);
    }
    useRestrictMessage(commonEmojiRegexp) {
        this.muc.add('modules_enabled', 'muc_peertubelivechat_restrict_message');
        this.muc.set('peertubelivechat_restrict_message_common_emoji_regexp', new ConfigEntryValueMultiLineString(commonEmojiRegexp));
    }
    addMucAdmins(jids) {
        for (const jid of jids) {
            this.muc.add('admins', jid);
        }
    }
    setLog(level, syslog) {
        let log = '';
        log += 'log = {\n';
        if (level !== 'error') {
            log += '  ' + level + ' = ' + writeValue(this.paths.log);
        }
        log += '  error = ' + writeValue(this.paths.error);
        if (syslog) {
            log += '  { to = "syslog"; levels = ' + writeValue(syslog) + ' };\n';
        }
        log += '\n};\n';
        this.log = log;
    }
    write() {
        let content = '';
        content += this.global.write();
        content += this.log + '\n';
        content += `
gc = {
  mode = "generational";
  minor_threshold = 5;
  major_threshold = 50;
};
`;
        content += '\n\n';
        if (this.authenticated) {
            content += this.authenticated.write();
            content += '\n\n';
        }
        if (this.anon) {
            content += this.anon.write();
            content += '\n\n';
        }
        if (this.bot) {
            content += this.bot.write();
            content += '\n\n';
        }
        if (this.external) {
            content += this.external.write();
            content += '\n\n';
        }
        content += this.muc.write();
        content += '\n\n';
        for (const externalComponent of this.externalComponents) {
            content += '\n\n';
            content += externalComponent.write();
            content += '\n\n';
        }
        return content;
    }
}
exports.ProsodyConfigContent = ProsodyConfigContent;
//# sourceMappingURL=content.js.map