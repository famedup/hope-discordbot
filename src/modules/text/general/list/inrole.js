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
  name: 'inrole',
  description: 'List members in a specific role',
  usage: 'list inrole <role>',
  category: 'general',
  
  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Please provide a role mention, ID, or name.');
    }

    const guild = message.guild;
    let role = message.mentions.roles.first();
    
    if (!role) {
      const roleQuery = args.join(' ');
      role = guild.roles.cache.find(r => 
        r.id === roleQuery || r.name.toLowerCase() === roleQuery.toLowerCase()
      );
    }

    if (!role) {
      return message.reply('Could not find that role.');
    }

    const members = Array.from(role.members.values());

    if (members.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Members in ${role.name}**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`No members found with the ${role.name} role.`)
      );

      return await message.reply({
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
      interactionOrMessage: message,
      pages: pages,
      renderPage: (pageIndex, pageData, state) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Members in ${role.name} [${members.length}]**`)
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

        const roleInfo = `**Role:** ${role.name}\n**Color:** ${role.hexColor}\n**Members:** ${members.length}`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(roleInfo)
        );

        return container;
      },
      userId: message.author.id,
      timeout: 300000
    });

    await paginationSession.renderInitial();
  }
};
