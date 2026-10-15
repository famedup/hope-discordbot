// ─── cashholy (carti) · developer ───

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
  aliases: [],
  
  async execute(message, args) {
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
              new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ size: 128 }))
            )
        );

      message.channel.send({
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
      
      message.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
