/* ---
   author : cashholy (carti)
   module : snipe
   --- */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { snipeData } = require('../../interactions/general/general');
const { createPaginationSession } = require('../../../services/pagination');

module.exports = {
  name: 'snipe',
  description: 'View the last deleted message in the channel',
  usage: 'snipe',
  category: 'general',
  
  async execute(message, args) {
    const channelSnipes = snipeData.get(message.channel.id) || [];

    if (channelSnipes.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Message Snipe**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`No recently deleted messages found in this channel.`)
        );

      return await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const paginationSession = createPaginationSession({
      interactionOrMessage: message,
      pages: channelSnipes,
      renderPage: (pageIndex, snipe) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Deleted Messages Retrieved**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        
        const authorInfo = `Author: <@${snipe.author_id}>`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(authorInfo)
        );

        
        const sentAt = `Sent at: <t:${snipe.deleted_at}:F>`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(sentAt)
        );

        
        const content = snipe.content || 'No text content';
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`__**Message Content**__\n\`\`\`${content}\`\`\``)
        );

        
        if (snipe.attachments && snipe.attachments.length > 0) {
          const attachmentLinks = snipe.attachments.map(att => `[${att.name}](${att.url})`).join('\n');
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Attachments:**\n${attachmentLinks}`)
          );
        }

        if (channelSnipes.length > 1) {
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
