/** @author cashholy (carti) */

// hope — sends the boost message for every boost the server announces (including repeat boosts).
// Needs the server's "boost" system messages switched on; boostUpdateEvent.js covers the first boost without them.

const { MessageType } = require('discord.js');
const { announce } = require('../services/greeter');
const { claim } = require('../services/boostGuard');

const BOOST_TYPES = new Set([
    MessageType.GuildBoost,
    MessageType.GuildBoostTier1,
    MessageType.GuildBoostTier2,
    MessageType.GuildBoostTier3,
]);

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        try {
            if (!message.guild || !BOOST_TYPES.has(message.type)) return;
            if (!claim(message.guild.id, message.author.id)) return;
            const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
            if (member) await announce('boost', member);
        } catch (err) {
            console.error('Boost message event error:', err.message);
        }
    },
};
