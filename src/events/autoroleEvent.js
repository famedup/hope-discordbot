/* ---
   author : cashholy (carti)
   module : autoroleEvent
   --- */

// hope — hands out the configured autoroles when someone joins.

const AutoRole = require('../database/schemas/AutoRole');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      if (!member.guild) return;
      const cfg = await AutoRole.read(member.guild.id);
      const ids = member.user.bot ? cfg.bots : cfg.humans;
      if (!ids.length) return;

      const me = member.guild.members.me;
      if (!me?.permissions.has('ManageRoles')) return;

      const roles = ids
        .map(id => member.guild.roles.cache.get(id))
        .filter(r => r && !r.managed && r.id !== member.guild.id && r.position < me.roles.highest.position);
      if (roles.length) await member.roles.add(roles, 'Autorole');
    } catch (e) {
      console.error('Autorole error:', e.message);
    }
  },
};
