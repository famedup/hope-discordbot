//
//  Made with care by cashholy (carti)
//

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('../../../../services/pagination');

module.exports = {
  name: 'createpos',
  
  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    await guild.members.fetch();
    const members = Array.from(guild.members.cache.values())
      .sort((a, b) => a.user.createdTimestamp - b.user.createdTimestamp);

    if (members.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Account Creation Dates**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`No members found in ${guild.name}.`)
      );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const itemsPerPage = 7;
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
          new TextDisplayBuilder().setContent(`**Account Creation Dates [${members.length}]**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const memberList = pageData.map((member, idx) => {
          const globalIdx = pageIndex * itemsPerPage + idx + 1;
          return `\`${globalIdx}.\` <@${member.id}> - <t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`;
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(memberList)
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const serverInfo = `**Server:** ${guild.name}\n**Total Members:** ${members.length}\n**Sorted by:** Account Creation Date`;
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
