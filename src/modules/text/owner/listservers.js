/*! © 2026 cashholy (carti) !*/

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder, MessageFlags } = require('discord.js');
const config = require('../../../settings');
const emojis = require('../../../media/emojis.json');
const { createPaginationSession } = require('../../../services/pagination');

const SERVERS_PER_PAGE = 5;

module.exports = {
  name: 'listservers',
  description: 'Show all servers the bot is currently in',
  aliases: ['servers', 'guilds', 'serverlist'],
  ownerOnly: true,

  async execute(message, args) {
    if (message.author.id !== config.OWNER_ID) {
      return message.reply('Only the bot owner can use this command.');
    }

    const guilds = Array.from(message.client.guilds.cache.values())
      .sort((a, b) => b.memberCount - a.memberCount);
    const totalGuilds = guilds.length;

    if (totalGuilds === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Server List')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('The bot is not in any servers.')
        );

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const totalPages = Math.ceil(totalGuilds / SERVERS_PER_PAGE);

    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      const startIndex = i * SERVERS_PER_PAGE;
      const endIndex = startIndex + SERVERS_PER_PAGE;
      pages.push({
        guilds: guilds.slice(startIndex, endIndex),
        startIndex,
        endIndex: Math.min(endIndex, totalGuilds)
      });
    }

    const renderPage = (pageIndex, pageData, state) => {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Server List')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );

      pageData.guilds.forEach((guild, index) => {
        const position = pageData.startIndex + index + 1;
        const serverText = `**${position}. ${guild.name}**\n` +
          `ID: \`${guild.id}\`\n` +
          `Members: **${guild.memberCount.toLocaleString()}**\n` +
          `Owner: \`${guild.ownerId}\``;

        const iconURL = guild.iconURL({ size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';

        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(serverText)
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconURL))
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        );
      });

      return container;
    };

    const pagination = createPaginationSession({
      interactionOrMessage: message,
      pages,
      renderPage,
      userId: message.author.id,
      initialPage: 0,
      timeout: 300000
    });

    await pagination.renderInitial();
  }
};
