/*
 * Developed by cashholy (carti)
 * File: modules/text/animals/panda.js
 */

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
  name: "panda",
  description: "Random picture of a panda",

  async execute(message) {
    try {
      const imageUrl = await fetchAnimalImage('panda');
      if (!imageUrl) return message.reply(`${emojis.error} No image found right now. Try again in a moment.`);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Random Panda`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription("Random panda image")
          )
        );

      await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      console.error("Error fetching panda image:", error);
      await message.reply(`${emojis.error} Failed to fetch panda image. Please try again later.`);
    }
  }
};
