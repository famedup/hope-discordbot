// ─── cashholy (carti) · developer ───

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('../../../../services/pagination');

module.exports = {
  name: 'mods',
  
  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    await guild.members.fetch();
    const mods = Array.from(guild.members.cache.filter(m => 
      m.permissions.has('BanMembers') || m.permissions.has('KickMembers')
    ).values()).sort((a, b) => a.joinedAt - b.joinedAt);

    if (mods.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Moderators**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`No moderators found in ${guild.name}.`)
      );

      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const itemsPerPage = 7;
    const totalPages = Math.ceil(mods.length / itemsPerPage);

    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(mods.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
    }

    const paginationSession = createPaginationSession({
      interactionOrMessage: interaction,
      pages: pages,
      renderPage: (pageIndex, pageData, state) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Moderators [${mods.length}]**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const modList = pageData.map((mod, idx) => {
          const globalIdx = pageIndex * itemsPerPage + idx + 1;
          return `\`${globalIdx}.\` <@${mod.id}> - <t:${Math.floor(mod.user.createdTimestamp / 1000)}:D>`;
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(modList)
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const serverInfo = `**Server:** ${guild.name}\n**Total Moderators:** ${mods.length}`;
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
