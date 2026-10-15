// »» engineered by cashholy (carti) ««

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
const DumpExporter = require('../../../../services/dumpExporter');

module.exports = {
  name: 'dumpsettings',
  description: 'Export all server configuration and settings',
  
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
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
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const content = DumpExporter.formatSettings(interaction.guild);
      const { path: filePath, filename } = await DumpExporter.createDumpFile('settings', content);
      
      const attachment = new AttachmentBuilder(filePath, { name: filename });
      
      const dmContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Server Settings Export**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Here is the server configuration for **${interaction.guild.name}**.`)
        )
        .addFileComponents(
          new FileBuilder().setURL(`attachment://${filename}`)
        );

      await interaction.user.send({
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
          new TextDisplayBuilder().setContent('The server settings have been sent to your DMs.')
        );

      await interaction.editReply({
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
          new TextDisplayBuilder().setContent(error.code === 50007 ? 'Failed to DM you. Please enable DMs from server members.' : 'Failed to export server settings.')
        );
      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
