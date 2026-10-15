// @cashholy(carti) — animalfact

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require("discord.js");

const emojis = require('../../../media/emojis.json');

module.exports = {
  name: "animalfact",
  description: "Random animal fact",

  async execute(message) {
    try {
      const animals = ['cat', 'dog', 'panda', 'fox', 'bird', 'koala', 'raccoon', 'kangaroo'];
      const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
      
      const response = await fetch(`https://some-random-api.com/animal/${randomAnimal}`);
      const data = await response.json();

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Random Animal Fact**`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(data.fact)
        );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error fetching animal fact:", error);
      await message.reply(`${emojis.error} Failed to fetch animal fact. Please try again later.`);
    }
  }
};
