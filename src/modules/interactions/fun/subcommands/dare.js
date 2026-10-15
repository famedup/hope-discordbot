//
//  Made with care by cashholy (carti)
//

const {
  ContainerBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SectionBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'dare',
  description: 'Give a random dare',
  
  async execute(interaction) {
    try {
      const response = await fetch('https://api.truthordarebot.xyz/v1/dare?rating=pg13');
      const data = await response.json();
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Dare Challenge')
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(data.question)
            )
            .setThumbnailAccessory(
              new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ size: 128 }))
            )
        );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Error')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Could not retrieve a dare from the API. Please try again later.')
        );
      
      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }
  },
};
