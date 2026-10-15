/* ⌁ crafted by cashholy (carti) ⌁ */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'joinpos',
  
  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild;
    await guild.members.fetch();
    const member = guild.members.cache.get(user.id);

    if (!member || !member.joinedTimestamp) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Could not fetch join position for this member.')
      );
      return await interaction.editReply({
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

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
