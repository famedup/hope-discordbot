// ─── cashholy (carti) · developer ───

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ChannelType
} = require('discord.js');
const { createPaginationSession } = require('../../../services/pagination');

module.exports = {
  name: 'listchannels',
  description: 'Display a list of all channels in the server',
  usage: 'listchannels',
  category: 'stats',
  
  async execute(message, args) {
    const guild = message.guild;
    const channels = Array.from(guild.channels.cache.values())
      .filter(c => c.type !== ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position);

    const categories = Array.from(guild.channels.cache.values())
      .filter(c => c.type === ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position);

    let channelList = [];

    for (const category of categories) {
      channelList.push({
        type: 'category',
        name: category.name,
        category: category
      });

      const categoryChannels = channels
        .filter(c => c.parentId === category.id)
        .sort((a, b) => a.position - b.position);

      for (const channel of categoryChannels) {
        channelList.push({
          type: 'channel',
          name: channel.name,
          channel: channel,
          channelType: channel.type
        });
      }
    }

    const uncategorizedChannels = channels
      .filter(c => !c.parentId)
      .sort((a, b) => a.position - b.position);

    if (uncategorizedChannels.length > 0) {
      channelList.push({
        type: 'category',
        name: 'Uncategorized',
        category: null
      });

      for (const channel of uncategorizedChannels) {
        channelList.push({
          type: 'channel',
          name: channel.name,
          channel: channel,
          channelType: channel.type
        });
      }
    }

    const itemsPerPage = 15;
    const totalPages = Math.ceil(channelList.length / itemsPerPage);

    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      pages.push(channelList.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
    }

    const getChannelTypePrefix = (type) => {
      switch (type) {
        case ChannelType.GuildText: return '#';
        case ChannelType.GuildVoice: return '🔊';
        case ChannelType.GuildAnnouncement: return '#';
        case ChannelType.GuildStageVoice: return '🔊';
        case ChannelType.GuildForum: return '#';
        default: return '#';
      }
    };

    const paginationSession = createPaginationSession({
      interactionOrMessage: message,
      pages: pages,
      renderPage: (pageIndex, pageData, state) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Server Channels [${channels.length}]**`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const lines = pageData.map(item => {
          if (item.type === 'category') {
            return `\n**${item.name}**`;
          } else {
            const prefix = getChannelTypePrefix(item.channelType);
            return `  ${prefix} ${item.channel.name}`;
          }
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(lines)
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
