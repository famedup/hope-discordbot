/** @author cashholy (carti) */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'nitro',
  description: 'Generate a fake nitro gift link',
  aliases: [],
  
  async execute(message, args) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Free Nitro Gift!')
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("Here's your free nitro gift!\n\nhttps://discord.gift/pnQQ9KxKuMqT2KNxHuKANhvc")
      );
    message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
