// »» engineered by cashholy (carti) ««

const { Events } = require('discord.js');
const { getAll } = require('../database/pg');
const { addVanityUser, hasVanityRole } = require('../database/vanityRoles');
const { run } = require('../database/pg');

let vanityConfigCache = null;
let vanityConfigCacheTs = 0;
const VANITY_CONFIG_TTL = 60000;

const vanityRoleCache = new Map();
const VANITY_ROLE_TTL = 15000;

async function getVanityConfigs() {
    if (vanityConfigCache && Date.now() - vanityConfigCacheTs < VANITY_CONFIG_TTL) {
        return vanityConfigCache;
    }
    const configs = await getAll('SELECT * FROM vanity_role_config');
    vanityConfigCache = configs || [];
    vanityConfigCacheTs = Date.now();
    return vanityConfigCache;
}

async function getCachedHasVanityRole(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const entry = vanityRoleCache.get(key);
    if (entry && Date.now() - entry.ts < VANITY_ROLE_TTL) return entry.val;
    const result = await hasVanityRole(guildId, userId);
    vanityRoleCache.set(key, { val: !!result, ts: Date.now() });
    return !!result;
}

function setVanityRoleCache(guildId, userId, val) {
    vanityRoleCache.set(`${guildId}:${userId}`, { val, ts: Date.now() });
}

module.exports = {
    name: Events.PresenceUpdate,
    async execute(oldPresence, newPresence) {
        try {
            if (newPresence.user?.bot) return;

            const allConfigs = await getVanityConfigs();
            if (!allConfigs || allConfigs.length === 0) return;

            const statusText = getStatusText(newPresence);

            for (const config of allConfigs) {
                const guild = newPresence.client.guilds.cache.get(config.guildId);
                if (!guild) continue;

                const member = guild.members.cache.get(newPresence.user.id);
                if (!member) continue;

                const role = guild.roles.cache.get(config.roleId);
                if (!role) continue;

                const hasVanity = checkVanityStatus(statusText, config.vanityCode);
                const userHasRole = await getCachedHasVanityRole(config.guildId, member.id);

                if (hasVanity && !userHasRole) {
                    try {
                        await member.roles.add(role, 'Vanity code detected in status');
                        await addVanityUser(config.guildId, member.id);
                        setVanityRoleCache(config.guildId, member.id, true);
                    } catch (error) {
                        console.error(`[VANITY] Failed to add role:`, error.message);
                    }
                } else if (!hasVanity && userHasRole) {
                    await run('DELETE FROM vanity_role_users WHERE "guildId" = $1 AND "userId" = $2', [config.guildId, member.id]);
                    setVanityRoleCache(config.guildId, member.id, false);
                    try {
                        await member.roles.remove(role, 'Vanity code no longer in status');
                    } catch (error) {
                        console.error(`[VANITY] Failed to remove role:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('[VANITY_ROLES] Error:', error.message);
        }
    }
};

function getStatusText(presence) {
    if (!presence.activities || presence.activities.length === 0) return '';
    return presence.activities.map(a => `${a.state || ''} ${a.name || ''}`).join(' ').toLowerCase();
}

function checkVanityStatus(statusText, vanityCode) {
    const lowerCode = vanityCode.toLowerCase();
    const patterns = [
        `discord.gg/${lowerCode}`,
        `.gg/${lowerCode}`,
        `/${lowerCode}`
    ];
    return patterns.some(pattern => statusText.includes(pattern.toLowerCase()));
}
