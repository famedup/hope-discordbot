/**
 * ┌ cashholy (carti)
 * └ modules/text/stats/joined.js
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'joined',
  description: 'Check when a specific user joined the server',
  usage: 'joined [user]',
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

    if (!member.joinedTimestamp) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Could not fetch join date for this member.')
      );
      return await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Join Information**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**User:** <@${user.id}>`,
      `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
      `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
      `**Account Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
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
