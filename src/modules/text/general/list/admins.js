/* ---
   author : cashholy (carti)
   module : admins
   --- */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('../../../../services/pagination');

module.exports = {
  name: 'admins',
  description: 'List all administrators in the server',
  usage: 'list admins',
  category: 'general',
  
  async execute(message, args) {
    const guild = message.guild;
    const admins = Array.from(guild.members.cache.filter(m => 
      m.permissions.has('Administrator')
    ).values()).sort((a, b) => {
      if (a.user.bot && !b.user.bot) return 1;
      if (!a.user.bot && b.user.bot) return -1;
      return 0;
    });

    if (admins.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Admins**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`No administrators found in ${guild.name}.`)
      );

      return await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const itemsPerPage = 7;
    const totalPages = Math.ceil(admins.length / itemsPerPage);

    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(admins.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
    }

    const paginationSession = createPaginationSession({
      interactionOrMessage: message,
      pages: pages,
      renderPage: (pageIndex, pageData, state) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Admins in ${guild.name} [${admins.length}]**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const adminList = pageData.map((admin, idx) => {
          const globalIdx = pageIndex * itemsPerPage + idx + 1;
          return `\`${globalIdx}.\` <@${admin.id}> - <t:${Math.floor(admin.user.createdTimestamp / 1000)}:D>`;
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(adminList)
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const serverInfo = `**Server:** ${guild.name}\n**Total Admins:** ${admins.length}`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(serverInfo)
        );

        return container;
      },
      userId: message.author.id,
      timeout: 300000
    });

    await paginationSession.renderInitial();
  }
};
