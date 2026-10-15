// [dev] cashholy (carti) :: events/logging/loggingUtils.js

const { AuditLogEvent } = require('discord.js');
const { LoggingConfig } = require('../../database/schemas');

const loggingConfigCache = new Map();
const LOGGING_CACHE_TTL = 60000;

async function getLogChannel(client, guildId, type, legacyType = null) {
    try {
        const cached = loggingConfigCache.get(guildId);
        let config;
        if (cached && Date.now() - cached.ts < LOGGING_CACHE_TTL) {
            config = cached.val;
        } else {
            config = await LoggingConfig.findOne({ where: { guildId } });
            loggingConfigCache.set(guildId, { val: config, ts: Date.now() });
        }
        if (!config) return null;

        let channelId = config[`${type}ChannelId`];
        if (!channelId && legacyType) {
            channelId = config[`${legacyType}EventsChannelId`];
        }
        if (!channelId) return null;

        return client.channels.cache.get(channelId);
    } catch (error) {
        return null;
    }
}

function invalidateLoggingCache(guildId) {
    loggingConfigCache.delete(guildId);
}

async function fetchAuditLogExecutor(guild, auditType, targetId, timeWindow = 10000) {
    try {
        const auditLogs = await guild.fetchAuditLogs({ type: auditType, limit: 5 });
        const now = Date.now();
        const entry = auditLogs.entries.find(e =>
            e.target?.id === targetId &&
            (now - e.createdTimestamp) < timeWindow
        );
        return entry?.executor || null;
    } catch (error) {
        return null;
    }
}

async function fetchAuditLogEntry(guild, auditType, targetId, timeWindow = 10000) {
    try {
        const auditLogs = await guild.fetchAuditLogs({ type: auditType, limit: 5 });
        const now = Date.now();
        const entry = auditLogs.entries.find(e =>
            e.target?.id === targetId &&
            (now - e.createdTimestamp) < timeWindow
        );
        return { executor: entry?.executor || null, reason: entry?.reason || null };
    } catch (error) {
        return { executor: null, reason: null };
    }
}

module.exports = { getLogChannel, invalidateLoggingCache, fetchAuditLogExecutor, fetchAuditLogEntry };
