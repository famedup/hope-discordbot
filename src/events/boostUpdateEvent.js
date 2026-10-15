// [dev] cashholy (carti) :: events/boostUpdateEvent.js

// hope — sends the boost message when someone starts boosting (their premium date appears).
// Extra boosts from the same person are caught by boostMessageEvent.js.

const { announce } = require('../services/greeter');
const { claim } = require('../services/boostGuard');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        try {
            if (oldMember.partial || oldMember.premiumSince || !newMember.premiumSince) return;
            if (!claim(newMember.guild.id, newMember.id)) return;
            await announce('boost', newMember);
        } catch (err) {
            console.error('Boost update event error:', err.message);
        }
    },
};
