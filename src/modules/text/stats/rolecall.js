// @cashholy(carti) — rolecall

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'rolecall',
  description: 'Count the number of users who have a specific role',
  usage: 'rolecall <role>',
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

    const memberCount = role.members.size;

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Role Call for ${role.name}**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**Role:** ${role.name}`,
      `**Members:** ${memberCount}`,
      `**Percentage:** ${((memberCount / message.guild.memberCount) * 100).toFixed(2)}%`,
      `**Color:** ${role.hexColor}`,
      `**Position:** ${role.position}`,
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
