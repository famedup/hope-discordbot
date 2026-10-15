// ▛▀ cashholy (carti) ▀▜

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
  AttachmentBuilder,
  FileBuilder,
} = require('discord.js');
const DumpExporter = require('../../../services/dumpExporter');

module.exports = {
  name: 'dumpchannels',
  description: 'Export a list of all text channels',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels) && 
        !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Permission Denied**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('You need Manage Channels or Administrator permission to use this command.')
        );
      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const loadingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Processing...**`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Exporting channels...')
      );
    
    const loadingMsg = await message.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });

    try {
      const content = DumpExporter.formatChannels(message.guild);
      const { path: filePath, filename } = await DumpExporter.createDumpFile('channels', content);
      
      const attachment = new AttachmentBuilder(filePath, { name: filename });
      
      const textChannelCount = message.guild.channels.cache.filter(ch => ch.type === 0).size;
      
      const dmContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Text Channels Export**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Here are the ${textChannelCount} text channels from **${message.guild.name}**.`)
        )
        .addFileComponents(
          new FileBuilder().setURL(`attachment://${filename}`)
        );

      await message.author.send({
        components: [dmContainer],
        flags: MessageFlags.IsComponentsV2,
        files: [attachment]
      });
      
      const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**File Sent**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('The channels list has been sent to your DMs.')
        );

      await loadingMsg.edit({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
      });
      
      await DumpExporter.cleanupFile(filePath);
    } catch (error) {
      console.error(error);
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Error**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(error.code === 50007 ? 'Failed to DM you. Please enable DMs from server members.' : 'Failed to export channels.')
        );
      await loadingMsg.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
