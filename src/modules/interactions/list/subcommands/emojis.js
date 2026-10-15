// »» engineered by cashholy (carti) ««

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('../../../../services/pagination');

module.exports = {
  name: 'emojis',
  
  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    const emojis = Array.from(guild.emojis.cache.values());

    if (emojis.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Emojis**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`No custom emojis found in ${guild.name}.`)
      );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const itemsPerPage = 7;
    const totalPages = Math.ceil(emojis.length / itemsPerPage);

    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(emojis.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
    }

    const paginationSession = createPaginationSession({
      interactionOrMessage: interaction,
      pages: pages,
      renderPage: (pageIndex, pageData, state) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Emojis in ${guild.name} [${emojis.length}]**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const emojiList = pageData.map((emoji, idx) => {
          const globalIdx = pageIndex * itemsPerPage + idx + 1;
          return `\`${globalIdx}.\` ${emoji} - \`${emoji.name}\``;
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(emojiList)
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const serverInfo = `**Server:** ${guild.name}\n**Total Emojis:** ${emojis.length}`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(serverInfo)
        );

        return container;
      },
      userId: interaction.user.id,
      timeout: 300000
    });

    await paginationSession.renderInitial();
  }
};
