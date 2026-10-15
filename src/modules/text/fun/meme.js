/* ⌁ crafted by cashholy (carti) ⌁ */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  name: 'meme',
  description: 'Send A Meme!',
  aliases: ['memes'],
  
  async execute(message, args) {
    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = await res.json();

      if (!data || !data.url) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### No Memes Found')
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Couldn't fetch a meme right now. Please try again!")
          );
        return message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Reddit Meme')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${data.title}**`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Author:** u/${data.author} | **Subreddit:** r/${data.subreddit}`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(data.url)
              .setDescription(data.title)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("View on Reddit")
              .setStyle(ButtonStyle.Link)
              .setURL(data.postLink)
          )
        );

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Meme API Error')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Failed to fetch a meme. Please try again later.')
        );
      message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
