// ▛▀ cashholy (carti) ▀▜

const { Events } = require('discord.js');
const { bumpLeave } = require('../database/serverStats');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        bumpLeave(member.guild.id).catch(err => console.error('[StatsMembership] Leave error:', err.message));
    }
};
