//
//  Made with care by cashholy (carti)
//

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'topic',
  description: 'Display the topic/description of a channel',
  usage: 'topic [channel]',
  category: 'stats',
  
  async execute(message, args) {
    let channel = message.mentions.channels.first() || message.channel;
    
    if (args.length > 0 && !message.mentions.channels.size) {
      const channelId = args[0].replace(/[<#>]/g, '');
      try {
        channel = await message.guild.channels.fetch(channelId);
      } catch (error) {
        channel = message.channel;
      }
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Channel Topic**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**Channel:** #${channel.name}`,
      `**Type:** ${channel.type}`,
    ].join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(info)
    );

    if (channel.topic) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Topic:**\n${channel.topic}`)
      );
    } else {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('This channel has no topic set.')
      );
    }

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
