// [dev] cashholy (carti) :: events/automod/automodEvents.js

const { PermissionFlagsBits } = require('discord.js');
const { AutomodConfig, AutomodWhitelist, ModLog, Warn, GuardSettings } = require('../../database/schemas');
const ui = require('../../services/ui');
const guardAI = require('../../services/guardAI');

const INVITE_REGEX = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
const LINK_REGEX = /(https?:\/\/[^\s]+)/i;

const messageTracker = new Map();

const automodConfigCache = new Map();
const whitelistCache = new Map();
const botMemberCache = new Map();
const AUTOMOD_CACHE_TTL = 30000;
const WHITELIST_CACHE_TTL = 30000;
const BOT_MEMBER_CACHE_TTL = 300000;

function getCachedConfig(guildId) {
    const entry = automodConfigCache.get(guildId);
    if (entry && Date.now() - entry.ts < AUTOMOD_CACHE_TTL) return entry.val;
    return undefined;
}
function setCachedConfig(guildId, val) {
    automodConfigCache.set(guildId, { val, ts: Date.now() });
}

function getCachedWhitelist(guildId, targetId) {
    const key = `${guildId}:${targetId}`;
    const entry = whitelistCache.get(key);
    if (entry && Date.now() - entry.ts < WHITELIST_CACHE_TTL) return entry.val;
    return undefined;
}
function setCachedWhitelist(guildId, targetId, val) {
    whitelistCache.set(`${guildId}:${targetId}`, { val, ts: Date.now() });
}

function getTrackerKey(guildId, userId) {
    return `${guildId}-${userId}`;
}

function trackMessage(guildId, userId) {
    const key = getTrackerKey(guildId, userId);
    const now = Date.now();

    if (!messageTracker.has(key)) {
        messageTracker.set(key, []);
    }

    messageTracker.get(key).push(now);
}

function getMessageCount(guildId, userId, intervalMs) {
    const key = getTrackerKey(guildId, userId);
    const now = Date.now();

    if (!messageTracker.has(key)) {
        return 0;
    }

    const messages = messageTracker.get(key).filter(time => now - time < intervalMs);

    if (messages.length === 0) {
        messageTracker.delete(key);
    } else {
        messageTracker.set(key, messages);
    }

    return messages.length;
}

function cleanupOldMessages() {
    const now = Date.now();
    const maxAge = 7200000;

    for (const [key, times] of messageTracker.entries()) {
        const recentTimes = times.filter(time => now - time < maxAge);
        if (recentTimes.length === 0) {
            messageTracker.delete(key);
        } else if (recentTimes.length !== times.length) {
            messageTracker.set(key, recentTimes);
        }
    }

    const cacheNow = Date.now();
    for (const [key, entry] of automodConfigCache.entries()) {
        if (cacheNow - entry.ts >= AUTOMOD_CACHE_TTL * 10) automodConfigCache.delete(key);
    }
    for (const [key, entry] of whitelistCache.entries()) {
        if (cacheNow - entry.ts >= WHITELIST_CACHE_TTL * 10) whitelistCache.delete(key);
    }
}

async function isWhitelisted(guildId, targetId, targetType, module) {
    let entry = getCachedWhitelist(guildId, targetId);
    if (entry === undefined) {
        entry = await AutomodWhitelist.findOne({ where: { guildId, targetId } });
        setCachedWhitelist(guildId, targetId, entry);
    }
    if (!entry) return false;

    const modules = entry.getModules();
    if (!modules || modules.length === 0) return true;

    return modules.includes(module);
}

async function checkWhitelist(message, module) {
    const guildId = message.guild.id;
    const ids = [message.author.id, ...message.member.roles.cache.keys(), message.channel.id];
    const results = await Promise.all(ids.map(id => isWhitelisted(guildId, id, null, module)));
    return results.some(Boolean);
}

async function getBotMember(guild) {
    const cached = botMemberCache.get(guild.id);
    if (cached && Date.now() - cached.ts < BOT_MEMBER_CACHE_TTL) return cached.val;
    const member = await guild.members.fetch(guild.client.user.id).catch(() => null);
    botMemberCache.set(guild.id, { val: member, ts: Date.now() });
    return member;
}

const ACTION_LABEL = { delete: 'Message deleted', warn: 'Warned', mute: 'Timed out', kick: 'Kicked', ban: 'Banned' };

function logEmbed(user, channelId, reason, action, content, { test = false } = {}) {
    const fields = [
        { name: 'Member', value: `<@${user.id}>`, inline: true },
        { name: 'Channel', value: channelId ? `<#${channelId}>` : 'None', inline: true },
        { name: 'Action', value: ACTION_LABEL[action] || action, inline: true },
    ];
    if (content) fields.push({ name: 'Message', value: '```' + String(content).replace(/`/g, "'").slice(0, 300) + '```' });
    return ui.embed({
        kind: test ? 'base' : (action === 'kick' || action === 'ban') ? 'error' : 'warning',
        author: { name: user.username, iconURL: user.displayAvatarURL?.({ size: 64 }) },
        title: test ? 'Test log' : 'Automod',
        description: reason,
        fields,
        footer: 'Automod',
        timestamp: true,
    });
}

async function postLog(guild, config, embed) {
    if (!config.logChannelId) return false;
    try {
        const channel = guild.channels.cache.get(config.logChannelId);
        if (!channel) return false;
        await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
        return true;
    } catch (error) {
        console.error('AutoMod log error:', error.message);
        return false;
    }
}

function sendLog(guild, config, message, reason, action) {
    return postLog(guild, config, logEmbed(message.author, message.channel.id, reason, action, message.content));
}

/** Sample entry so admins can confirm the log channel works. */
function sendTest(guild, config, user) {
    return postLog(guild, config, logEmbed(user, null, 'This is how an action will look.', config.punishment || 'delete', null, { test: true }));
}

/** Drop cached config / exemptions for a guild after the panel edits them. */
function bust(guildId) {
    automodConfigCache.delete(guildId);
    for (const key of whitelistCache.keys()) if (key.startsWith(guildId + ':')) whitelistCache.delete(key);
}

async function executePunishment(message, config, reason, moduleName, forced) {
    try {
        await message.delete().catch(err => {
            console.error(`[AUTOMOD] Failed to delete message:`, err.message);
        });

        const member = message.member;
        if (!member) return;

        const guild = message.guild;
        const botMember = await getBotMember(guild);
        if (!botMember) {
            console.error('[AUTOMOD] Failed to fetch bot member');
            return;
        }

        if (member.roles.highest.position >= botMember.roles.highest.position) return;
        if (member.id === guild.ownerId) return;

        const punishmentKey = moduleName ? moduleName + 'Punishment' : null;
        const punishment = forced || (punishmentKey && config[punishmentKey]) || config.punishment || 'delete';

        switch (punishment) {
            case 'warn':
                await Warn.create({ guildId: guild.id, userId: member.id, moderatorId: guild.client.user.id, reason: `AutoMod: ${reason}` })
                    .catch(err => console.error('[AUTOMOD] Failed to save warning:', err.message));
                break;
            case 'mute':
                await member.timeout(config.muteDuration * 1000, `AutoMod: ${reason}`).catch(err => {
                    console.error(`[AUTOMOD] Failed to mute ${member.user.tag}:`, err.message);
                });
                break;
            case 'kick':
                await member.kick(`AutoMod: ${reason}`).catch(err => {
                    console.error(`[AUTOMOD] Failed to kick ${member.user.tag}:`, err.message);
                });
                break;
            case 'ban':
                await guild.members.ban(member.id, { reason: `AutoMod: ${reason}` }).catch(err => {
                    console.error(`[AUTOMOD] Failed to ban ${member.user.tag}:`, err.message);
                });
                break;
        }

        await sendLog(guild, config, message, reason, punishment);

        try {
            await ModLog.create({
                guildId: guild.id,
                moderatorId: guild.client.user.id,
                moderatorTag: guild.client.user.tag,
                targetId: message.author.id,
                targetTag: message.author.tag,
                action: punishment,
                reason: reason,
                channelId: message.channel.id,
                source: 'automod'
            });
        } catch (dbError) {
            console.error('ModLog save error:', dbError.message);
        }
    } catch (error) {
        console.error('AutoMod punishment error:', error);
    }
}

function containsInvite(content) {
    return INVITE_REGEX.test(content);
}

function containsLink(content) {
    return LINK_REGEX.test(content);
}

function containsBadWord(content, badWords) {
    const lowerContent = content.toLowerCase();
    return badWords.some(word => lowerContent.includes(word.toLowerCase()));
}

function getMentionCount(message) {
    return message.mentions.users.size + message.mentions.roles.size;
}

function getCapsPercentage(content) {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return 0;
    const caps = letters.replace(/[^A-Z]/g, '').length;
    return (caps / letters.length) * 100;
}

module.exports = {
    name: 'automodEvents',
    bust,
    sendTest,

    async init(client) {
        setInterval(cleanupOldMessages, 300000);
        client.on('messageCreate', async (message) => {
            if (!message.guild) return;
            if (message.author.bot) return;
            if (message.system) return;

            let config = getCachedConfig(message.guild.id);
            if (config === undefined) {
                config = await AutomodConfig.findOne({ where: { guildId: message.guild.id } });
                setCachedConfig(message.guild.id, config);
            }
            if (!config?.enabled) return;

            if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

            const content = message.content;

            if (config.antiSpam) {
                if (!await checkWhitelist(message, 'antiSpam')) {
                    trackMessage(message.guild.id, message.author.id);
                    const count = getMessageCount(message.guild.id, message.author.id, config.spamInterval * 1000);

                    if (count > config.spamThreshold) {
                        await executePunishment(message, config, `Spam detected (${count} messages in ${config.spamInterval}s)`, 'antiSpam');
                        return;
                    }
                }
            }

            if (config.antiInvite) {
                if (!await checkWhitelist(message, 'antiInvite')) {
                    if (containsInvite(content)) {
                        await executePunishment(message, config, 'Discord invite link', 'antiInvite');
                        return;
                    }
                }
            }

            if (config.antiLink) {
                if (!await checkWhitelist(message, 'antiLink')) {
                    if (containsLink(content)) {
                        await executePunishment(message, config, 'External link', 'antiLink');
                        return;
                    }
                }
            }

            if (config.antiBadWords) {
                if (!await checkWhitelist(message, 'antiBadWords')) {
                    const badWords = config.getBadWords();
                    if (badWords.length > 0 && containsBadWord(content, badWords)) {
                        await executePunishment(message, config, 'Blacklisted word', 'antiBadWords');
                        return;
                    }
                }
            }

            if (config.antiMassMention) {
                if (!await checkWhitelist(message, 'antiMassMention')) {
                    const mentionCount = getMentionCount(message);
                    if (mentionCount > config.mentionLimit) {
                        await executePunishment(message, config, `Mass mention (${mentionCount} mentions)`, 'antiMassMention');
                        return;
                    }
                }
            }

            if (config.antiPing) {
                if (!await checkWhitelist(message, 'antiPing')) {
                    if (message.mentions.everyone) {
                        await executePunishment(message, config, 'Ping (@everyone / @here)', 'antiPing');
                        return;
                    }
                }
            }

            if (config.antiCaps) {
                if (!await checkWhitelist(message, 'antiCaps')) {
                    if (content.length >= config.capsMinLength) {
                        const capsPercent = getCapsPercentage(content);
                        if (capsPercent > config.capsPercentage) {
                            await executePunishment(message, config, `Excessive caps (${Math.round(capsPercent)}%)`, 'antiCaps');
                            return;
                        }
                    }
                }
            }

            // AI Moderation: only for messages the rule filters let through.
            if (content.length >= 6 && guardAI.available()) {
                const ai = await GuardSettings.read(message.guild.id, 'automod');
                if (ai.ai && !await checkWhitelist(message, 'ai')) {
                    const verdict = await guardAI.judgeMessage(message.guild.id, content, { categories: ai.categories, level: ai.level });
                    if (verdict?.flag) {
                        await executePunishment(message, config, `AI Moderation: ${verdict.category}`, 'ai', ai.action || 'delete');
                    }
                }
            }
        });
    }
};
