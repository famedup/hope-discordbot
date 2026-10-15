// [dev] cashholy (carti) :: modules/interactions/stats/subcommands/emojiinfo.js

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'emojiinfo',
  
  async execute(interaction) {
    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');
    
    const emojiMatch = emojiInput.match(/<a?:(\w+):(\d+)>/);
    let emoji = null;
    
    if (emojiMatch) {
      const emojiId = emojiMatch[2];
      emoji = interaction.guild.emojis.cache.get(emojiId);
    } else {
      emoji = interaction.guild.emojis.cache.find(e => e.name === emojiInput);
    }

    if (!emoji) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Could not find that emoji in this server.')
      );
      return await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Emoji Information**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**Name:** ${emoji.name}`,
      `**ID:** ${emoji.id}`,
      `**Animated:** ${emoji.animated ? 'Yes' : 'No'}`,
      `**Created:** <t:${Math.floor(emoji.createdTimestamp / 1000)}:F>`,
      `**Mention:** \`${emoji.toString()}\``,
      `**URL:** [Download](${emoji.url})`,
    ].join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(info)
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(emoji.url)
          .setDescription(emoji.name)
      )
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
