/**
 * ┌ cashholy (carti)
 * └ modules/text/dump/dumpcategories.js
 */

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
  name: 'dumpcategories',
  description: 'Export a list of all channel categories',
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
        new TextDisplayBuilder().setContent('Exporting categories...')
      );
    
    const loadingMsg = await message.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });

    try {
      const content = DumpExporter.formatCategories(message.guild);
      const { path: filePath, filename } = await DumpExporter.createDumpFile('categories', content);
      
      const attachment = new AttachmentBuilder(filePath, { name: filename });
      
      const categoryCount = message.guild.channels.cache.filter(ch => ch.type === 4).size;
      
      const dmContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Channel Categories Export**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Here are the ${categoryCount} categories from **${message.guild.name}**.`)
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
          new TextDisplayBuilder().setContent('The categories list has been sent to your DMs.')
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
          new TextDisplayBuilder().setContent(error.code === 50007 ? 'Failed to DM you. Please enable DMs from server members.' : 'Failed to export categories.')
        );
      await loadingMsg.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
