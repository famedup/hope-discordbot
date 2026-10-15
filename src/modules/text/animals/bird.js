/** @author cashholy (carti) */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require("discord.js");

const emojis = require('../../../media/emojis.json');
const { fetchAnimalImage } = require('../../../services/animalApi');

module.exports = {
  name: "bird",
  description: "Random picture of a bird",

  async execute(message) {
    try {
      const imageUrl = await fetchAnimalImage('bird');
      if (!imageUrl) return message.reply(`${emojis.error} No image found right now. Try again in a moment.`);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Random Bird`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription("Random bird image")
          )
        );

      await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error("Error fetching bird image:", error);
      await message.reply(`${emojis.error} Failed to fetch bird image. Please try again later.`);
    }
  }
};
