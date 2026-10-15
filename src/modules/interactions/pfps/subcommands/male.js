/* ⌁ crafted by cashholy (carti) ⌁ */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');
const { createPaginationSession } = require('../../../../services/pagination');
const { fetchPfps } = require('../../../../services/pfpApi');

module.exports = {
  name: 'male',
  description: 'Browse male profile pictures',

  async execute(interaction) {
    await interaction.deferReply();

    let pfps;
    try {
      pfps = await fetchPfps('male');
    } catch {
      pfps = [];
    }

    if (!pfps || pfps.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} No male pfps found. Try again later.`)
        );
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const pagination = createPaginationSession({
      interactionOrMessage: interaction,
      pages: pfps,
      userId: interaction.user.id,
      renderPage: (pageIndex, imageUrl) => {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Male Profile Pictures`)
        );
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(imageUrl).setDescription('Male Profile Picture')
          )
        );
        return container;
      }
    });

    await pagination.renderInitial();
  }
};
