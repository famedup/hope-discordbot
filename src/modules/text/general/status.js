// »» engineered by cashholy (carti) ««

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'status',
  description: 'Shows the status of a user in detail',
  usage: 'status [user]',
  category: 'general',
  
  async execute(message, args) {
    let user;
    
    if (message.mentions.users.size > 0) {
      user = message.mentions.users.first();
    } else if (args[0]) {
      try {
        user = await message.client.users.fetch(args[0]);
      } catch {
        return message.reply('User not found. Please mention a user or provide a valid user ID.');
      }
    } else {
      user = message.author;
    }

    const member = message.guild.members.cache.get(user.id);

    const statusEmoji = {
      'online': 'Online',
      'idle': 'Idle',
      'dnd': 'Do Not Disturb',
      'offline': 'Offline'
    };

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${user.displayName}'s Status**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    if (member) {
      const presence = member.presence;
      const status = statusEmoji[presence?.status || 'offline'];
      const avatarUrl = user.displayAvatarURL({ size: 256 });

      let platforms = [];
      if (presence?.clientStatus) {
        if (presence.clientStatus.desktop) platforms.push('Desktop');
        if (presence.clientStatus.mobile) platforms.push('Mobile');
        if (presence.clientStatus.web) platforms.push('Browser');
      }
      const platform = platforms.length > 0 ? platforms.join(', ') : 'None (Offline)';

      let statusContent = `**Status:** ${status}\n**Platform:** ${platform}`;

      const customStatus = presence?.activities.find(a => a.type === 4);
      if (customStatus) {
        const emoji = customStatus.emoji ? `${customStatus.emoji} ` : '';
        const text = customStatus.state || '';
        if (emoji || text) {
          statusContent += `\n**Custom Status:** ${emoji}${text}`;
        }
      }

      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(statusContent)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(avatarUrl)
          )
      );

      const activities = presence?.activities.filter(a => a.type !== 4) || [];
      if (activities.length > 0) {
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );

        const activityTexts = activities.map(activity => {
          if (activity.type === 0) return `Playing ${activity.name}`;
          if (activity.type === 1) return `Streaming ${activity.name}`;
          if (activity.type === 2) return `Listening to ${activity.name}`;
          if (activity.type === 3) return `Watching ${activity.name}`;
          if (activity.type === 5) return `Competing in ${activity.name}`;
          return activity.name;
        }).join('\n');

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Activity:**\n${activityTexts}`)
        );
      }
    } else {
      const avatarUrl = user.displayAvatarURL({ size: 256 });
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Status:** Offline\n**User ID:** ${user.id}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(avatarUrl)
          )
      );
    }

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
