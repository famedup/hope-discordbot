// ─── cashholy (carti) · developer ───

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const { addIgnoredChannel, getIgnoredChannel, getIgnoredChannelsCount } = require('../../../../database/ignoreDb');

module.exports = {
  name: 'add',
  description: 'Add a channel to the ignore list',
  
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

    const channel = message.mentions.channels.first();
    
    if (!channel) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Invalid Usage**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Please mention a channel.\n\n**Usage:** `ignore channel add <#channel>`')
        );
      
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const count = getIgnoredChannelsCount(message.guild.id);
    if (count >= 30) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Limit Reached**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('You can only add up to 30 channels to the ignore list.')
        );
      
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const existing = getIgnoredChannel(message.guild.id, channel.id);
    if (existing) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Already Ignored**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${channel} is already in the ignore channels list.`)
        );
      
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      addIgnoredChannel(message.guild.id, channel.id);
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Success**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Successfully added ${channel} to the ignore channels list.`
        )
      );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error('Error adding ignored channel:', error);
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Error**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Failed to add channel to ignore list. Please try again.')
        );
      
      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
