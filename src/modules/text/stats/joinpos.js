/** @author cashholy (carti) */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'joinpos',
  description: 'Show the join position of a specific user',
  usage: 'joinpos [user]',
  category: 'stats',
  
  async execute(message, args) {
    let user = message.mentions.users.first() || message.author;
    
    if (args.length > 0 && !message.mentions.users.size) {
      const userId = args[0].replace(/[<@!>]/g, '');
      try {
        user = await message.client.users.fetch(userId);
      } catch (error) {
        user = message.author;
      }
    }

    const member = await message.guild.members.fetch(user.id);
    const guild = message.guild;

    if (!member.joinedTimestamp) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Could not fetch join position for this member.')
      );
      return await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const members = Array.from(guild.members.cache.values())
      .filter(m => m.joinedTimestamp)
      .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

    const position = members.findIndex(m => m.id === member.id) + 1;

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Join Position**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**User:** <@${user.id}>`,
      `**Join Position:** ${position} of ${members.length}`,
      `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
      `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
    ].join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(info)
    );

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
