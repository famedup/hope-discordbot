/** @author cashholy (carti) */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  ChannelType
} = require('discord.js');

const channelTypeNames = {
  [ChannelType.GuildText]: 'Text Channel',
  [ChannelType.GuildVoice]: 'Voice Channel',
  [ChannelType.GuildCategory]: 'Category',
  [ChannelType.GuildAnnouncement]: 'Announcement Channel',
  [ChannelType.AnnouncementThread]: 'Announcement Thread',
  [ChannelType.PublicThread]: 'Public Thread',
  [ChannelType.PrivateThread]: 'Private Thread',
  [ChannelType.GuildStageVoice]: 'Stage Channel',
  [ChannelType.GuildForum]: 'Forum Channel',
};

module.exports = {
  name: 'channelinfo',
  description: 'Get detailed information about a channel',
  usage: 'channelinfo [channel]',
  category: 'stats',
  
  async execute(message, args) {
    let channel = message.mentions.channels.first() || message.channel;
    
    if (args.length > 0 && !message.mentions.channels.size) {
      const channelId = args[0].replace(/[<#>]/g, '');
      try {
        channel = await message.guild.channels.fetch(channelId);
      } catch (error) {
        channel = message.channel;
      }
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Channel Information**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**Name:** #${channel.name}`,
      `**ID:** ${channel.id}`,
      `**Type:** ${channelTypeNames[channel.type] || 'Unknown'}`,
      `**Created:** <t:${Math.floor(channel.createdTimestamp / 1000)}:F>`,
      `**Position:** ${channel.position ?? 'N/A'}`,
    ];

    if (channel.parent) {
      info.push(`**Category:** ${channel.parent.name}`);
    }

    if (channel.nsfw !== undefined) {
      info.push(`**NSFW:** ${channel.nsfw ? 'Yes' : 'No'}`);
    }

    if (channel.rateLimitPerUser !== undefined) {
      info.push(`**Slowmode:** ${channel.rateLimitPerUser > 0 ? `${channel.rateLimitPerUser}s` : 'Disabled'}`);
    }

    if (channel.bitrate) {
      info.push(`**Bitrate:** ${channel.bitrate / 1000}kbps`);
    }

    if (channel.userLimit !== undefined && channel.userLimit > 0) {
      info.push(`**User Limit:** ${channel.userLimit}`);
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(info.join('\n'))
    );

    if (channel.topic) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Topic:**\n${channel.topic}`)
      );
    }

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
