/** @author cashholy (carti) */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'size',
  description: 'Shows pp size (for fun)',
  aliases: ['pp', 'ppsize'],
  
  async execute(message, args) {
    let user = message.author;
    
    if (message.mentions.users.size > 0) {
      user = message.mentions.users.first();
    } else if (args.length > 0) {
      try {
        const userId = args[0].replace(/[<@!>]/g, '');
        const fetchedUser = await message.client.users.fetch(userId);
        if (fetchedUser) user = fetchedUser;
      } catch (error) {
      }
    }

    const userId = user.id;
    const seed = parseInt(userId.slice(-8), 16);
    const length = (seed % 15) + 1;

    const shaft = '='.repeat(length);
    const sizeDisplay = `8${shaft}D`;

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Size Measurement`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${user.username}'s** size: ${sizeDisplay}`)
      );

    return message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
