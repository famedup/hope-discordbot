//
//  Made with care by cashholy (carti)
//

const { Events } = require('discord.js');
const { getReactionRoleConfig, getPairs, findMatchingPair } = require('../services/reactionRoleHelper');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    if (user.bot) return;

    try {
      await reaction.fetch();

      const config = await getReactionRoleConfig(reaction.message.id, reaction.message.guild.id);
      if (!config) return;

      const pairs = getPairs(config);
      if (pairs.length === 0) return;

      const pair = findMatchingPair(pairs, reaction.emoji);
      if (!pair) return;

      try {
        const member = reaction.message.guild.members.cache.get(user.id)
          || await reaction.message.guild.members.fetch(user.id);
        const role = reaction.message.guild.roles.cache.get(pair.roleId);

        if (role) {
          await member.roles.add(role);
        }
      } catch (memberError) {
        console.error(`Error adding role:`, memberError.message);
      }
    } catch (error) {
      console.error('Error handling reaction add:', error);
    }
  }
};
