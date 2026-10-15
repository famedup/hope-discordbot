/**
 * ┌ cashholy (carti)
 * └ modules/text/ignore/channel/show.js
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const { getAllIgnoredChannels } = require('../../../../database/ignoreDb');

module.exports = {
  name: 'show',
  description: 'Display all ignored channels',
  aliases: ['list'],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Permission Denied**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('You need Administrator permission to use this command.')
        );
      
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const channels = getAllIgnoredChannels(message.guild.id);

    if (!channels || channels.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Ignored Channels**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('No channels are currently ignored in this server.')
        );
      
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const channelList = channels.map(ch => {
      const channel = message.guild.channels.cache.get(ch.channel_id);
      return channel ? `${channel}` : `Channel ID: ${ch.channel_id}`;
    }).join('\n');

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Ignored Channels**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(channelList)
    );

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
