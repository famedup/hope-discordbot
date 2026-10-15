/*
 * Developed by cashholy (carti)
 * File: modules/text/general/editsnipe.js
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { editSnipeData } = require('../../interactions/general/general');
const { createPaginationSession } = require('../../../services/pagination');

module.exports = {
  name: 'editsnipe',
  description: 'View the last edited message in the channel',
  usage: 'editsnipe',
  category: 'general',

  async execute(message, args) {
    const channelEditSnipes = editSnipeData.get(message.channel.id) || [];

    if (channelEditSnipes.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Message Edit Snipe**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`No recently edited messages found in this channel.`)
        );

      return await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const paginationSession = createPaginationSession({
      interactionOrMessage: message,
      pages: channelEditSnipes,
      renderPage: (pageIndex, editSnipe) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Edited Messages Retrieved**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        
        const authorInfo = `Author: <@${editSnipe.author_id}>`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(authorInfo)
        );

        
        const editedAt = `Edited at: <t:${editSnipe.edited_at}:F>`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(editedAt)
        );

        
        const contentBefore = editSnipe.content_before || 'No text content';
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`__**Message Content**__\n\`\`\`${contentBefore}\`\`\``)
        );

        
        if (editSnipe.attachments_before && editSnipe.attachments_before.length > 0) {
          const attachmentLinks = editSnipe.attachments_before.map(att => `[${att.name}](${att.url})`).join('\n');
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Attachments:**\n${attachmentLinks}`)
          );
        }

        if (channelEditSnipes.length > 1) {
          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );
        }

        return container;
      },
      userId: message.author.id,
      timeout: 300000
    });

    await paginationSession.renderInitial();
  }
};
