// [dev] cashholy (carti) :: services/reactionRoleHelper.js

const ReactionRoles = require('../database/schemas/ReactionRoles');

const reactionRoleCache = new Map();
const CACHE_TTL = 30000;

async function getReactionRoleConfig(messageId, guildId) {
    const key = `${messageId}:${guildId}`;
    const cached = reactionRoleCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.val;

    const config = await ReactionRoles.findOne({
        where: { messageId, guildId, enabled: true }
    });
    reactionRoleCache.set(key, { val: config, ts: Date.now() });
    return config;
}

function invalidateReactionRoleCache(messageId, guildId) {
    reactionRoleCache.delete(`${messageId}:${guildId}`);
}

function getPairs(config) {
    let pairs = config.emojiRolePairs;
    if (typeof pairs === 'string') {
        try { pairs = JSON.parse(pairs); } catch (e) { pairs = []; }
    }
    return Array.isArray(pairs) ? pairs : [];
}

function findMatchingPair(pairs, emoji) {
    const emojiString = emoji.toString().trim();
    const emojiId = emoji.id;
    const emojiName = emoji.name;

    for (const p of pairs) {
        const storedEmoji = (p.emoji || '').trim();
        if (storedEmoji === emojiString) return p;
        if (emojiId && storedEmoji === emojiId) return p;
        if (emojiId && storedEmoji.includes(emojiId)) return p;
        if (emojiName && storedEmoji.includes(emojiName)) return p;
    }
    return null;
}

module.exports = { getReactionRoleConfig, invalidateReactionRoleCache, getPairs, findMatchingPair };
