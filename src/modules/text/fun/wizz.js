/* ⌁ crafted by cashholy (carti) ⌁ */

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
  aliases: [],
  
  async execute(message, args) {
    const loadingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Starting Wizz Process')
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Wizzing ${message.guild.name}, will take 22 seconds to complete...`)
      );
    
    const msg = await message.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
    const steps = [
      "Changing all guild settings...",
      `Deleting **${message.guild.roles.cache.size}** Roles...`,
      `Deleting **${message.guild.channels.cache.size}** Channels...`,
      "Deleting Webhooks...",
      "Deleting emojis...",
      "Installing Ban Wave..."
    ];
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const progressContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Wizz in Progress')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(step)
        );
      await msg.edit({
        components: [progressContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Wizz Complete')
      )
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Successfully Wizzed ${message.guild.name}**\n\nDon't worry, this is all fake!`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ size: 128 }))
          )
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Wizzed By:** ${message.author.username}`)
      );

    await msg.edit({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
