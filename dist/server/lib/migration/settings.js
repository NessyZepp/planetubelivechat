"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateSettings = migrateSettings;
const helpers_1 = require("../helpers");
async function migrateSettings(options) {
    const logger = options.peertubeHelpers.logger;
    logger.info('Checking if there is a migration script to launch...');
    await _migrateConverseTheme(options);
}
async function _migrateConverseTheme(options) {
    const peertubeHelpers = options.peertubeHelpers;
    const logger = peertubeHelpers.logger;
    logger.info('Checking if we need to migrate converse-theme');
    if (!/^[-a-z]+$/.test(helpers_1.pluginShortName)) {
        throw new Error(`Wrong pluginShortName '${helpers_1.pluginShortName}'`);
    }
    const [results] = await peertubeHelpers.database.query('SELECT "settings" FROM "plugin"' +
        ' WHERE "plugin"."name" = :pluginShortName', {
        replacements: {
            pluginShortName: helpers_1.pluginShortName
        }
    });
    if (!Array.isArray(results)) {
        throw new Error('_migrateConverseTheme: query result is not an array.');
    }
    if (results.length === 0) {
        logger.error('Plugin not found in database');
        return;
    }
    if (results.length > 1) {
        logger.error('Multiple lines for plugin in database, dont know which one to migrate... Aborting.');
        return;
    }
    const settings = results[0].settings;
    if (!settings) {
        logger.info('Plugin settings are empty in database, no migration needed.');
        return;
    }
    if (typeof settings !== 'object') {
        logger.error('Plugin settings in database seems to be invalid json');
        return;
    }
    if (!('converse-theme' in settings)) {
        logger.debug('The setting converse-theme is not here, no need to migrate.');
        return;
    }
    if (settings['converse-theme'] !== 'concord') {
        logger.debug('The setting converse-theme is not set to concord, no need to migrate.');
        return;
    }
    logger.info('The setting converse-theme is set to concord, we must replace by peertube..');
    await peertubeHelpers.database.query('UPDATE "plugin" ' +
        ' SET "settings" = "settings" || :value ' +
        ' WHERE "name" = :pluginShortName', {
        replacements: {
            pluginShortName: helpers_1.pluginShortName,
            value: JSON.stringify({
                'converse-theme': 'peertube'
            })
        }
    });
}
//# sourceMappingURL=settings.js.map