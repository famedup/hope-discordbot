//
//  Made with care by cashholy (carti)
//

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const { getMediaChannel } = require('../../../../database/mediaDb');

module.exports = {
  async execute(interactionOrMessage, args = []) {
    const member = interactionOrMessage.member;
    const guild = interactionOrMessage.guild;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Permission Denied**`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('You need Administrator permission to use this command.'));
      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const mediaChannelData = await getMediaChannel(guild.id);

    if (!mediaChannelData) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Media Channel Configuration**`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('There is no media-only channel set for this server.'));
      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const channel = guild.channels.cache.get(mediaChannelData.channel_id);

    if (!channel) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Channel Not Found**`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('The configured media channel has been deleted. Please set up a new one.'));
      return interactionOrMessage.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Media Channel Configuration**`));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Configured Channel:** ${channel}\n` +
        `**Channel ID:** \`${channel.id}\``
      )
    );

    await interactionOrMessage.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
