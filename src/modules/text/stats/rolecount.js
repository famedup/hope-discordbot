/*! © 2026 cashholy (carti) !*/

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'rolecount',
  description: 'Count the total number of roles on the server',
  usage: 'rolecount',
  category: 'stats',
  
  async execute(message, args) {
    const guild = message.guild;
    const roles = guild.roles.cache;
    
    const totalRoles = roles.size - 1;
    const rolesWithMembers = roles.filter(r => r.members.size > 0 && r.id !== guild.id).size;
    const emptyRoles = roles.filter(r => r.members.size === 0 && r.id !== guild.id).size;
    const managedRoles = roles.filter(r => r.managed).size;

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Role Count for ${guild.name}**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**Total Roles:** ${totalRoles}`,
      `**Roles with Members:** ${rolesWithMembers}`,
      `**Empty Roles:** ${emptyRoles}`,
      `**Managed Roles:** ${managedRoles}`,
      `**Hoisted Roles:** ${roles.filter(r => r.hoist).size}`,
      `**Mentionable Roles:** ${roles.filter(r => r.mentionable).size}`,
    ].join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(info)
    );

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
