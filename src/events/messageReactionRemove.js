/**
 * ┌ cashholy (carti)
 * └ events/messageReactionRemove.js
 */

const { Events } = require('discord.js');
const { getReactionRoleConfig, getPairs, findMatchingPair } = require('../services/reactionRoleHelper');

module.exports = {
  name: Events.MessageReactionRemove,
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

      const member = reaction.message.guild.members.cache.get(user.id)
        || await reaction.message.guild.members.fetch(user.id);
      const role = reaction.message.guild.roles.cache.get(pair.roleId);

      if (role) {
        await member.roles.remove(role);
      }
    } catch (error) {
      console.error('Error handling reaction remove:', error);
    }
  }
};
