/**
 * ┌ cashholy (carti)
 * └ modules/interactions/general/banner.js
 */

const {
  SlashCommandBuilder,
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Get the banner of a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get the banner from')
        .setRequired(false)
    ),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    
    try {
      const fetchedUser = await interaction.client.users.fetch(user.id, { force: true });
      
      if (!fetchedUser.banner) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# **${user.displayName}** doesn't have a banner set.`)
          );

        return await interaction.reply({
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
            .setDescription(`${user.displayName}'s Banner`)
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

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Failed to fetch user banner.`)
        );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};
