// @cashholy(carti) — lastjoins

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('../../../../services/pagination');

module.exports = {
  name: 'lastjoins',
  
  async execute(interaction) {
    await interaction.deferReply();

    const count = interaction.options.getInteger('count') || 10;
    const guild = interaction.guild;
    await guild.members.fetch();
    
    const members = Array.from(guild.members.cache.values())
      .filter(m => m.joinedTimestamp)
      .sort((a, b) => b.joinedTimestamp - a.joinedTimestamp)
      .slice(0, count);

    if (members.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Could not fetch member join data.')
      );
      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(members.length / itemsPerPage);

    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(members.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
    }

    const paginationSession = createPaginationSession({
      interactionOrMessage: interaction,
      pages: pages,
      renderPage: (pageIndex, pageData, state) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Last ${count} Members to Join**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const memberList = pageData.map((member, idx) => {
          const globalIdx = pageIndex * itemsPerPage + idx + 1;
          return `\`${globalIdx}.\` <@${member.id}> - <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`;
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(memberList)
        );

        if (state.totalPages > 1) {
          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Page ${pageIndex + 1} of ${state.totalPages}`)
          );
        }

        return container;
      },
      userId: interaction.user.id,
      timeout: 300000
    });

    await paginationSession.renderInitial();
  }
};
