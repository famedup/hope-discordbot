/**
 * @file avatar.js
 * @developer cashholy (carti)
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const i18n = require('../../../localization');

module.exports = {
  name: 'avatar',
  description: 'Get the avatar of a user',
  usage: 'avatar [user]',
  category: 'general',
  
  async execute(message, args) {
    const tr = i18n.translator(message);
    const user = message.mentions.users.first() || message.author;

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${tr('avatar.title', { name: user.displayName })}**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const jpgUrl = user.displayAvatarURL({ extension: 'jpg', size: 4096 });
    const pngUrl = user.displayAvatarURL({ extension: 'png', size: 4096 });

    const mediaGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL(jpgUrl)
          .setDescription(tr('avatar.title', { name: user.displayName }))
      );

    container.addMediaGalleryComponents(mediaGallery);

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const buttonRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('JPG')
          .setStyle(ButtonStyle.Link)
          .setURL(jpgUrl),
        new ButtonBuilder()
          .setLabel('PNG')
          .setStyle(ButtonStyle.Link)
          .setURL(pngUrl)
      );

    container.addActionRowComponents(buttonRow);

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
