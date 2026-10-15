// ─── cashholy (carti) · developer ───

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  SectionBuilder,
  MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('../../../../services/pagination');
const emojis = require('../../../../media/emojis.json');

module.exports = {
  name: 'boosters',
  
  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    await guild.members.fetch();
    const boosters = Array.from(guild.members.cache.filter(m => m.premiumSince).values())
      .sort((a, b) => a.premiumSince - b.premiumSince);

    if (boosters.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Server Boosters**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`No boosters found in ${guild.name}.`)
      );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const itemsPerPage = 7;
    const totalPages = Math.ceil(boosters.length / itemsPerPage);

    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(boosters.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
    }

    const paginationSession = createPaginationSession({
      interactionOrMessage: interaction,
      pages: pages,
      renderPage: (pageIndex, pageData, state) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Server Boosters [${boosters.length}]**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const boosterList = pageData.map((member, idx) => {
          const globalIdx = pageIndex * itemsPerPage + idx + 1;
          return `\`${globalIdx}.\` <@${member.id}> - <t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>`;
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(boosterList)
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const serverInfo = `**Server:** ${guild.name}\n**Boost Level:** ${guild.premiumTier}\n**Total Boosts:** ${guild.premiumSubscriptionCount}`;
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
