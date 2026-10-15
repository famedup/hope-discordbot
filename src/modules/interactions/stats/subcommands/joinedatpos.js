/* ---
   author : cashholy (carti)
   module : joinedatpos
   --- */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'joinedatpos',
  
  async execute(interaction) {
    await interaction.deferReply();

    const position = interaction.options.getInteger('position');
    const guild = interaction.guild;
    await guild.members.fetch();
    
    const members = Array.from(guild.members.cache.values())
      .filter(m => m.joinedTimestamp)
      .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

    if (position > members.length) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Invalid position. This server only has ${members.length} members.`)
      );
      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const member = members[position - 1];

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Member at Position ${position}**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**User:** <@${member.id}>`,
      `**Position:** ${position} of ${members.length}`,
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
