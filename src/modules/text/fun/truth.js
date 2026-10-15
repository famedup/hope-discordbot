/* ---
   author : cashholy (carti)
   module : truth
   --- */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'truth',
  description: 'Give a random truth question',
  aliases: [],
  
  async execute(message, args) {
    try {
      const response = await fetch('https://api.truthordarebot.xyz/v1/truth?rating=pg13');
      const data = await response.json();
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Truth Challenge')
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
          new TextDisplayBuilder().setContent('Could not retrieve a truth question from the API. Please try again later.')
        );
      
      message.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
