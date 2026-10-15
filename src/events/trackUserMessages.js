/** @author cashholy (carti) */

const { Events } = require('discord.js');
const { run } = require('../database/pg');

const pending = new Map();

async function flush() {
    if (pending.size === 0) return;
    const entries = [...pending.entries()];
    pending.clear();
    for (const [key, count] of entries) {
        const sep = key.indexOf(':');
        const userId = key.slice(0, sep);
        const guildId = key.slice(sep + 1);
        try {
            await run(
                `INSERT INTO user_messages ("userId", "guildId", count) VALUES ($1, $2, $3)
                 ON CONFLICT("userId", "guildId") DO UPDATE SET count = user_messages.count + $3`,
                [userId, guildId, count]
            );
        } catch (error) {
            console.error('[TRACK MESSAGES] Flush error:', error);
        }
    }
}

setInterval(flush, 5000);

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const key = `${message.author.id}:${message.guild.id}`;
        pending.set(key, (pending.get(key) || 0) + 1);
    }
};
