/** @author cashholy (carti) */

const { Events } = require('discord.js');
const { isPublicChannel } = require('../services/statsScope');
const { bumpMessage, todayKey } = require('../database/serverStats');

const pending = new Map(); // "guildId:channelId:userId" -> count

function flush() {
    if (pending.size === 0) return;
    const entries = [...pending.entries()];
    pending.clear();
    const date = todayKey();

    for (const [key, count] of entries) {
        const [guildId, channelId, userId] = key.split(':');
        bumpMessage(guildId, channelId, userId, count, date)
            .catch(err => console.error('[StatsMessages] Flush error:', err.message));
    }
}

setInterval(flush, 10_000);

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;
        if (!isPublicChannel(message.channel)) return; // hidden/staff channels don't count

        const key = `${message.guild.id}:${message.channel.id}:${message.author.id}`;
        pending.set(key, (pending.get(key) || 0) + 1);
    }
};
