// @cashholy(carti) — dumpwarns

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
const { pool } = require('../../../database/pg');
const path = require('path');

module.exports = {
  name: 'dumpwarns',
  description: 'Export all moderation warnings',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
        !message.member.permissions.has(PermissionFlagsBits.ModerateMembers) &&
        !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Permission Denied**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('You need Manage Server, Moderate Members, or Administrator permission to use this command.')
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
        new TextDisplayBuilder().setContent('Exporting warnings...')
      );
    
    const loadingMsg = await message.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });

    try {
      let warns = [];
      try {
        const result = await pool.query(
          `SELECT * FROM warns WHERE "guildId" = $1 ORDER BY "createdAt" DESC`,
          [message.guild.id]
        );
        warns = result.rows;
      } catch (dbError) {
        throw new Error('DATABASE_NOT_FOUND');
      }

      let content = '';
      if (warns.length === 0) {
        content = 'No warnings found for this server.';
      } else {
        content = `Total Warnings: ${warns.length}\n\n` + warns.map((warn, index) => {
          return `\n[Warning #${index + 1}]\n` +
                 `  User ID: ${warn.userId}\n` +
                 `  Moderator ID: ${warn.moderatorId}\n` +
                 `  Reason: ${warn.reason || 'No reason provided'}\n` +
                 `  Date: ${new Date(warn.createdAt).toLocaleString()}\n` +
                 `  Warn ID: ${warn.id}`;
        }).join('\n' + '-'.repeat(60));
      }
      
      const { path: filePath, filename } = await DumpExporter.createDumpFile('warnings', content);
      
      const attachment = new AttachmentBuilder(filePath, { name: filename });
      
      const dmContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Warnings Export**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Here are the ${warns.length} warnings from **${message.guild.name}**.`)
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
          new TextDisplayBuilder().setContent('The warnings list has been sent to your DMs.')
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
          new TextDisplayBuilder().setContent(
            error.code === 50007 
              ? 'Failed to DM you. Please enable DMs from server members.' 
              : error.message === 'DATABASE_NOT_FOUND'
              ? 'Failed to export warnings. The warnings database may not exist yet.'
              : 'Failed to export warnings.'
          )
        );
      await loadingMsg.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
