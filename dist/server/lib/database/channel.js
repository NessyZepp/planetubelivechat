"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChannelNameById = getChannelNameById;
exports.getUserNameByChannelId = getUserNameByChannelId;
exports.getChannelInfosById = getChannelInfosById;
async function getChannelNameById(options, channelId) {
    if (!channelId) {
        throw new Error('Missing channelId');
    }
    if (!Number.isInteger(channelId)) {
        throw new Error('Invalid channelId: not an integer');
    }
    const [results] = await options.peertubeHelpers.database.query('SELECT "actor"."preferredUsername"' +
        ' FROM "videoChannel"' +
        ' RIGHT JOIN "actor" ON "actor"."id" = "videoChannel"."actorId"' +
        ' WHERE "videoChannel"."id" = ' + channelId.toString());
    if (!Array.isArray(results)) {
        throw new Error('getChannelNameById: query result is not an array.');
    }
    if (!results[0]) {
        options.peertubeHelpers.logger.debug(`getChannelNameById: channel ${channelId} not found.`);
        return null;
    }
    return results[0].preferredUsername ?? null;
}
async function getUserNameByChannelId(options, channelId) {
    if (!channelId) {
        throw new Error('Missing channelId');
    }
    if (!Number.isInteger(channelId)) {
        throw new Error('Invalid channelId: not an integer');
    }
    const [results] = await options.peertubeHelpers.database.query('SELECT "user"."username"' +
        ' FROM "videoChannel"' +
        ' JOIN "account" ON "account"."id" = "videoChannel"."accountId"' +
        ' JOIN "user" ON "account"."userId" = "user"."id" ' +
        ' WHERE "videoChannel"."id" = ' + channelId.toString());
    if (!Array.isArray(results)) {
        throw new Error('getUserNameByChannelId: query result is not an array.');
    }
    if (!results[0]) {
        options.peertubeHelpers.logger.debug(`getUserNameByChannelId: channel ${channelId} not found.`);
        return null;
    }
    return results[0].username ?? null;
}
async function getChannelInfosById(options, channelId, restrictToLocalChannels = false) {
    if (!channelId) {
        throw new Error('Missing channelId');
    }
    if (!Number.isInteger(channelId)) {
        throw new Error('Invalid channelId: not an integer');
    }
    const [results] = await options.peertubeHelpers.database.query('SELECT' +
        ' "actor"."preferredUsername" as "channelName",' +
        ' "videoChannel"."id" as "channelId",' +
        ' "videoChannel"."name" as "channelDisplayName",' +
        ' "videoChannel"."accountId" as "ownerAccountId"' +
        ' FROM "videoChannel"' +
        ' RIGHT JOIN "actor" ON "actor"."id" = "videoChannel"."actorId"' +
        ' WHERE "videoChannel"."id" = ' + channelId.toString() +
        (restrictToLocalChannels
            ? ' AND "serverId" is null '
            : ''));
    if (!Array.isArray(results)) {
        throw new Error('getChannelInfosById: query result is not an array.');
    }
    if (!results[0]) {
        options.peertubeHelpers.logger.debug(`getChannelInfosById: channel ${channelId} not found.`);
        return null;
    }
    return {
        id: results[0].channelId,
        name: results[0].channelName ?? '',
        displayName: results[0].channelDisplayName ?? '',
        ownerAccountId: results[0].ownerAccountId
    };
}
//# sourceMappingURL=channel.js.map