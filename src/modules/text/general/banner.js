// @cashholy(carti) — banner

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
  name: 'banner',
  description: 'Get the banner of a user',
  usage: 'banner [user]',
  category: 'general',
  
  async execute(message, args) {
    const tr = i18n.translator(message);
    let user = message.mentions.users.first();
    
    if (!user && args.length > 0) {
      try {
        user = await message.client.users.fetch(args[0]);
      } catch (e) {
        user = message.author;
      }
    }
    
    if (!user) {
      user = message.author;
    }
    
    try {
      const fetchedUser = await message.client.users.fetch(user.id, { force: true });
      
      if (!fetchedUser.banner) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# ${tr('banner.none', { name: user.displayName })}`)
          );

        return await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31);

      const jpgUrl = fetchedUser.bannerURL({ extension: 'jpg', size: 4096 });
      const pngUrl = fetchedUser.bannerURL({ extension: 'png', size: 4096 });

      const mediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(jpgUrl)
            .setDescription(tr('banner.title', { name: user.displayName }))
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
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# ${tr('banner.failed')}`)
        );

      await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
