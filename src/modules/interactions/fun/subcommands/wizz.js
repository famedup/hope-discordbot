// ▛▀ cashholy (carti) ▀▜

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'wizz',
  description: 'Fake server destruction command',
  
  async execute(interaction) {
    const loadingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Starting Wizz Process`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Wizzing ${interaction.guild.name}, will take 22 seconds to complete...`)
      );
    
    await interaction.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
    const steps = [
      "Changing all guild settings...",
      `Deleting **${interaction.guild.roles.cache.size}** Roles...`,
      `Deleting **${interaction.guild.channels.cache.size}** Channels...`,
      "Deleting Webhooks...",
      "Deleting emojis...",
      "Installing Ban Wave..."
    ];
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const progressContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`### Wizz in Progress`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(step)
        );
      await interaction.editReply({
        components: [progressContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Wizz Complete`)
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Successfully Wizzed ${interaction.guild.name}**\nDon't worry, this is all fake!`),
            new TextDisplayBuilder().setContent(`Wizzed by ${interaction.user.username}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ size: 128 }))
          )
      );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
