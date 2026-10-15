/*! © 2026 cashholy (carti) !*/

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('../../../../services/pagination');

module.exports = {
  name: 'invoice',
  description: 'List all users in your voice channel',
  usage: 'list invoice',
  category: 'general',
  
  async execute(message, args) {
    const guild = message.guild;
    const member = guild.members.cache.get(message.author.id);

    if (!member.voice || !member.voice.channel) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Voice Channel Users**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`You are not connected to a voice channel.`)
      );

      return await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const voiceChannel = member.voice.channel;
    const members = Array.from(voiceChannel.members.values());

    if (members.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Voice List of ${voiceChannel.name}**`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`No members found in this voice channel.`)
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
          new TextDisplayBuilder().setContent(`**Voice List of ${voiceChannel.name} [${members.length}]**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const memberList = pageData.map((vcMember, idx) => {
          const globalIdx = pageIndex * itemsPerPage + idx + 1;
          const status = vcMember.voice.selfMute ? '🔇' : vcMember.voice.selfDeaf ? '🔇🎧' : '🎙️';
          return `\`${globalIdx}.\` ${status} <@${vcMember.id}>`;
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(memberList)
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const channelInfo = `**Channel:** ${voiceChannel.name}\n**Members:** ${members.length}`;
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(channelInfo)
        );

        return container;
      },
      userId: message.author.id,
      timeout: 300000
    });

    await paginationSession.renderInitial();
  }
};
