//
//  Made with care by cashholy (carti)
//

const { Events } = require('discord.js');
const { isPublicChannel } = require('../services/statsScope');
const { bumpReactions, todayKey } = require('../database/serverStats');

const pending = new Map(); // guildId -> count

function flush() {
    if (pending.size === 0) return;
    const entries = [...pending.entries()];
    pending.clear();
    const date = todayKey();

    for (const [guildId, count] of entries) {
        bumpReactions(guildId, count, date)
            .catch(err => console.error('[StatsReactions] Flush error:', err.message));
    }
}

setInterval(flush, 10_000);

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        if (user.bot) return;
        const guild = reaction.message?.guild;
        if (!guild) return;
        if (!isPublicChannel(reaction.message.channel)) return;

        pending.set(guild.id, (pending.get(guild.id) || 0) + 1);
    }
};
