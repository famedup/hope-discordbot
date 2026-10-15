//
//  Made with care by cashholy (carti)
//

const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require("discord.js");

const emojis = require('../../../media/emojis.json');
const { fetchAnimalImage } = require('../../../services/animalApi');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("animals")
    .setDescription("Random animal pictures and facts")
    .addSubcommand(subcommand =>
      subcommand
        .setName("cat")
        .setDescription("Random picture of a cat")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("dog")
        .setDescription("Random picture of a dog")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("fox")
        .setDescription("Random picture of a fox")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("duck")
        .setDescription("Random picture of a duck")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("panda")
        .setDescription("Random picture of a panda")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("redpanda")
        .setDescription("Random picture of a red panda")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("bird")
        .setDescription("Random picture of a bird")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("bunny")
        .setDescription("Random picture of a bunny")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("bear")
        .setDescription("Random picture of a bear")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("pig")
        .setDescription("Random picture of a pig")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("possum")
        .setDescription("Random picture of a possum")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("sheep")
        .setDescription("Random picture of a sheep")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("snake")
        .setDescription("Random picture of a snake")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("squirrel")
        .setDescription("Random picture of a squirrel")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("fact")
        .setDescription("Random animal fact")
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    try {
      let imageUrl, title;

      const animalTitles = {
        cat: 'Random Cat', dog: 'Random Dog', fox: 'Random Fox',
        duck: 'Random Duck', panda: 'Random Panda', redpanda: 'Random Red Panda',
        bird: 'Random Bird', bunny: 'Random Bunny', bear: 'Random Bear',
        pig: 'Random Pig', possum: 'Random Possum', sheep: 'Random Sheep',
        snake: 'Random Snake', squirrel: 'Random Squirrel'
      };

      if (subcommand === 'fact') {
        const animals = ['cat', 'dog', 'panda', 'fox', 'bird', 'koala', 'raccoon', 'kangaroo'];
        const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
        const factData = await fetch(`https://some-random-api.com/animal/${randomAnimal}`).then(r => r.json());
        const factContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Random Animal Fact\n\n${factData.fact}`)
          );
        return await interaction.editReply({
          components: [factContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }

      title = animalTitles[subcommand] || `Random ${subcommand}`;
      imageUrl = await fetchAnimalImage(subcommand);

      if (!imageUrl) {
        return await interaction.editReply({ content: `${emojis.error} No image found right now. Try again in a moment.` });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${title}`)
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(imageUrl)
              .setDescription(`${title} image`)
          )
        );

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error fetching animal image:", error);
      await interaction.editReply({
        content: `${emojis.error} Failed to fetch animal content. Please try again later.`
      });
    }
  }
};
