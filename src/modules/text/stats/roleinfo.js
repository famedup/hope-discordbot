/** @author cashholy (carti) */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'roleinfo',
  description: 'Get detailed information about a role',
  usage: 'roleinfo <role>',
  category: 'stats',
  
  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Please provide a role mention, ID, or name.');
    }

    let role = message.mentions.roles.first();
    
    if (!role) {
      const roleQuery = args.join(' ');
      role = message.guild.roles.cache.find(r => 
        r.id === roleQuery || r.name.toLowerCase() === roleQuery.toLowerCase()
      );
    }

    if (!role) {
      return message.reply('Could not find that role.');
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Role Information**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**Name:** ${role.name}`,
      `**ID:** ${role.id}`,
      `**Color:** ${role.hexColor}`,
      `**Members:** ${role.members.size}`,
      `**Position:** ${role.position}`,
      `**Hoisted:** ${role.hoist ? 'Yes' : 'No'}`,
      `**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}`,
      `**Managed:** ${role.managed ? 'Yes' : 'No'}`,
      `**Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:F>`,
      `**Permissions:** ${role.permissions.toArray().length} permissions`,
    ].join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(info)
    );

    if (role.iconURL()) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Icon URL:** [View Icon](${role.iconURL()})`)
      );
    }

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
