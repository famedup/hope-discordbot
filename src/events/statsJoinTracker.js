// dev: cashholy (carti) | module: statsJoinTracker

const { Events } = require('discord.js');
const { bumpJoin } = require('../database/serverStats');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        bumpJoin(member.guild.id).catch(err => console.error('[StatsMembership] Join error:', err.message));
    }
};
