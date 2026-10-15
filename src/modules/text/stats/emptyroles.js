// @cashholy(carti) — emptyroles

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('../../../services/pagination');

module.exports = {
  name: 'emptyroles',
  description: 'Show all roles that have zero members assigned to them',
  usage: 'emptyroles',
  category: 'stats',
  
  async execute(message, args) {
    const guild = message.guild;
    const emptyRoles = Array.from(guild.roles.cache.values())
      .filter(r => r.members.size === 0 && r.id !== guild.id)
      .sort((a, b) => b.position - a.position);

    if (emptyRoles.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Empty Roles**')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('All roles have at least one member.')
      );

      return await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(emptyRoles.length / itemsPerPage);

    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(emptyRoles.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
    }

    const paginationSession = createPaginationSession({
      interactionOrMessage: message,
      pages: pages,
      renderPage: (pageIndex, pageData, state) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Empty Roles [${emptyRoles.length}]**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const roleList = pageData.map((role, idx) => {
          const globalIdx = pageIndex * itemsPerPage + idx + 1;
          return `\`${globalIdx}.\` ${role.name} - Position: ${role.position}`;
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(roleList)
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Page ${pageIndex + 1} of ${state.totalPages}`)
        );

        return container;
      },
      userId: message.author.id,
      timeout: 300000
    });

    await paginationSession.renderInitial();
  }
};
