// [dev] cashholy (carti) :: events/interactions/farewellHandler.js

const emojis = require('../../media/emojis.json');
const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ChannelType,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');
const { FarewellConfig, GuildConfig } = require('../../database/schemas');
const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id.startsWith('farewell_setup_simple_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Only the command user can use this menu!'));
        return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Farewell Setup - Simple'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Select the channel where farewell messages will be sent:'))
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId(`farewell_channel_simple_${originalUserId}`)
              .setPlaceholder('Select farewell channel')
              .setChannelTypes(ChannelType.GuildText)
          )
        );

      return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (id.startsWith('farewell_setup_container_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Only the command user can use this menu!'));
        return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Farewell Setup - Container'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Select the channel where farewell messages will be sent:'))
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId(`farewell_channel_container_${originalUserId}`)
              .setPlaceholder('Select farewell channel')
              .setChannelTypes(ChannelType.GuildText)
          )
        );

      return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (id.startsWith('farewell_submit_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Only the command user can use this menu!'));
        return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      await interaction.deferUpdate();
      try {
        const config = await FarewellConfig.findOne({ where: { guildId: interaction.guild.id } });
        if (config) {
          await GuildConfig.upsert({ guildId: interaction.guild.id, welcomeOutOn: true });

          const container = new ContainerBuilder().setAccentColor(0x57F287)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emojis.success} Farewell Setup Complete!`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**Type:** ${config.type === 'container' ? 'Container' : 'Simple'}\n` +
                `**Channel:** <#${config.channelId}>\n\n` +
                `Farewell messages are now active!`
              )
            );
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      } catch (error) {
        console.error('Farewell submit error:', error);
      }
      return true;
    }

    if (id === 'farewell_variables') {
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Available Placeholders'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('-# Use these placeholders in your farewell message:\n\n**{mention}**\nMentions the user (e.g., @UserName).\n\n**{avatar}**\nThe user\'s avatar URL.\n\n**{user}**\nThe user\'s username.\n\n**{user_nick}**\nThe user\'s nickname in the server.\n\n**{joindate}**\nThe user\'s join date in the server (formatted as Day, Month Day, Year).\n\n**{user_createdate}**\nThe user\'s account creation date (formatted as Day, Month Day, Year).\n\n**{server}**\nThe server\'s name.\n\n**{count}**\nThe server\'s total member count.\n\n**{server_icon}**\nThe server\'s icon URL.')
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Add placeholders directly in the farewell message or container fields.'));

      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }

    if (id.startsWith('farewell_cancel_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Only the command user can use this menu!'));
        return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Farewell Setup Cancelled'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('The farewell setup has been cancelled. Your existing configuration (if any) has been preserved.'));

      return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }

  if (interaction.isModalSubmit()) {
    if (id === 'farewell_simple_message') {
      await interaction.deferUpdate();
      try {
        const message = interaction.fields.getTextInputValue('farewell_message');
        await FarewellConfig.update({ message: message }, { where: { guildId: interaction.guild.id } });
        await GuildConfig.upsert({ guildId: interaction.guild.id, welcomeOutOn: true });

        const container = new ContainerBuilder().setAccentColor(0x57F287)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emojis.success} Farewell Setup Complete!`))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Type:** Simple\n**Message:**\n${message}\n\nFarewell messages are now active!`)
          );

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (error) {
        console.error('Farewell simple message error:', error);
      }
      return true;
    }

    if (id.startsWith('farewell_field_')) {
      const originalUserId = id.split('_').pop();
      await interaction.deferUpdate();
      try {
        const field = id.replace('farewell_field_', '').replace(`_${originalUserId}`, '');
        let updateData = {};

        if (field === 'title') {
          updateData.title = interaction.fields.getTextInputValue('farewell_title');
        } else if (field === 'description') {
          updateData.description = interaction.fields.getTextInputValue('farewell_description');
        } else if (field === 'color') {
          const colorValue = interaction.fields.getTextInputValue('farewell_color');
          const hexMatch = colorValue.match(/^#?([0-9A-Fa-f]{6})$/);
          if (hexMatch) {
            updateData.color = parseInt(hexMatch[1], 16);
          }
        } else if (field === 'thumbnail') {
          const thumbnailValue = interaction.fields.getTextInputValue('farewell_thumbnail');
          if (thumbnailValue.startsWith('{') || thumbnailValue.startsWith('http://') || thumbnailValue.startsWith('https://')) {
            updateData.thumbnailUrl = thumbnailValue;
          }
        } else if (field === 'image') {
          const imageValue = interaction.fields.getTextInputValue('farewell_image');
          if (imageValue.startsWith('{') || imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
            updateData.imageUrl = imageValue;
          }
        }

        await FarewellConfig.update(updateData, { where: { guildId: interaction.guild.id } });
        const config = await FarewellConfig.findOne({ where: { guildId: interaction.guild.id } });

        const previewContainer = new ContainerBuilder();
        if (config.color) previewContainer.setAccentColor(config.color);

        previewContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${config.title || 'Farewell'}`));
        previewContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

        if (isValidUrl(config.thumbnailUrl)) {
          const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(config.description || 'No description set.'))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(config.thumbnailUrl));
          previewContainer.addSectionComponents(section);
        } else {
          previewContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(config.description || 'No description set.'));
        }

        if (isValidUrl(config.imageUrl)) {
          previewContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
          previewContainer.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.imageUrl)));
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`farewell_field_select_${originalUserId}`)
          .setPlaceholder('Select a field to customize')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Title').setDescription('Set the container title').setValue('title'),
            new StringSelectMenuOptionBuilder().setLabel('Description').setDescription('Set the container description').setValue('description'),
            new StringSelectMenuOptionBuilder().setLabel('Color').setDescription('Set the accent color (hex code)').setValue('color'),
            new StringSelectMenuOptionBuilder().setLabel('Thumbnail').setDescription('Set the thumbnail image URL').setValue('thumbnail'),
            new StringSelectMenuOptionBuilder().setLabel('Image').setDescription('Set the main image URL').setValue('image')
          );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`farewell_submit_${originalUserId}`).setLabel('Submit').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('farewell_variables').setLabel('Variables').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`farewell_cancel_${originalUserId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ components: [previewContainer, selectRow, buttonRow], flags: MessageFlags.IsComponentsV2 });
      } catch (error) {
        console.error('Farewell field update error:', error);
      }
      return true;
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (id.startsWith('farewell_field_select_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Only the command user can use this menu!'));
        return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const selectedField = interaction.values[0];
      let modal;

      if (selectedField === 'title') {
        modal = new ModalBuilder().setCustomId(`farewell_field_title_${originalUserId}`).setTitle('Set Title');
        const input = new TextInputBuilder().setCustomId('farewell_title').setLabel('Container Title').setPlaceholder('Goodbye from {server}!').setStyle(TextInputStyle.Short).setMaxLength(256).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
      } else if (selectedField === 'description') {
        modal = new ModalBuilder().setCustomId(`farewell_field_description_${originalUserId}`).setTitle('Set Description');
        const input = new TextInputBuilder().setCustomId('farewell_description').setLabel('Container Description').setPlaceholder('Goodbye {user}! We will miss you.').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
      } else if (selectedField === 'color') {
        const colorSelectMenu = new StringSelectMenuBuilder()
          .setCustomId(`farewell_color_select_${originalUserId}`)
          .setPlaceholder('Choose color option')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Custom Color').setDescription('Enter a custom hex color code').setValue('custom'),
            new StringSelectMenuOptionBuilder().setLabel('None').setDescription('Remove accent color').setValue('none')
          );
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Set Accent Color'))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('Choose an option:'))
          .addActionRowComponents(new ActionRowBuilder().addComponents(colorSelectMenu));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else if (selectedField === 'thumbnail') {
        modal = new ModalBuilder().setCustomId(`farewell_field_thumbnail_${originalUserId}`).setTitle('Set Thumbnail');
        const input = new TextInputBuilder().setCustomId('farewell_thumbnail').setLabel('Thumbnail URL').setPlaceholder('https://example.com/image.png or use {avatar}').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
      } else if (selectedField === 'image') {
        modal = new ModalBuilder().setCustomId(`farewell_field_image_${originalUserId}`).setTitle('Set Image');
        const input = new TextInputBuilder().setCustomId('farewell_image').setLabel('Image URL').setPlaceholder('https://example.com/banner.png or use {server_icon}').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
      }

      if (modal) return interaction.showModal(modal);
      return true;
    }

    if (id.startsWith('farewell_color_select_')) {
      const originalUserId = id.split('_').pop();
      const selectedValue = interaction.values[0];

      if (selectedValue === 'none') {
        await interaction.deferUpdate();
        await FarewellConfig.update({ color: null }, { where: { guildId: interaction.guild.id } });
        const config = await FarewellConfig.findOne({ where: { guildId: interaction.guild.id } });

        const previewContainer = new ContainerBuilder();
        if (config.color) previewContainer.setAccentColor(config.color);
        previewContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${config.title || 'Farewell'}`));
        previewContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        if (isValidUrl(config.thumbnailUrl)) {
          const section = new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(config.description || 'No description set.')).setThumbnailAccessory(new ThumbnailBuilder().setURL(config.thumbnailUrl));
          previewContainer.addSectionComponents(section);
        } else {
          previewContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(config.description || 'No description set.'));
        }
        if (isValidUrl(config.imageUrl)) {
          previewContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
          previewContainer.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.imageUrl)));
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`farewell_field_select_${originalUserId}`)
          .setPlaceholder('Select a field to customize')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Title').setDescription('Set the container title').setValue('title'),
            new StringSelectMenuOptionBuilder().setLabel('Description').setDescription('Set the container description').setValue('description'),
            new StringSelectMenuOptionBuilder().setLabel('Color').setDescription('Set the accent color (hex code)').setValue('color'),
            new StringSelectMenuOptionBuilder().setLabel('Thumbnail').setDescription('Set the thumbnail image URL').setValue('thumbnail'),
            new StringSelectMenuOptionBuilder().setLabel('Image').setDescription('Set the main image URL').setValue('image')
          );
        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`farewell_submit_${originalUserId}`).setLabel('Submit').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('farewell_variables').setLabel('Variables').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`farewell_cancel_${originalUserId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );
        return interaction.editReply({ components: [previewContainer, selectRow, buttonRow], flags: MessageFlags.IsComponentsV2 });
      } else {
        const modal = new ModalBuilder().setCustomId(`farewell_field_color_${originalUserId}`).setTitle('Set Color');
        const input = new TextInputBuilder().setCustomId('farewell_color').setLabel('Hex Color Code').setPlaceholder('#5865F2 or 5865F2').setStyle(TextInputStyle.Short).setMinLength(6).setMaxLength(7).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id.startsWith('farewell_channel_simple_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31).addTextDisplayComponents(new TextDisplayBuilder().setContent('Only the command user can use this menu!'));
        return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31).addTextDisplayComponents(new TextDisplayBuilder().setContent('Please select a valid channel.'));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      await FarewellConfig.upsert({ guildId: interaction.guild.id, channelId: selectedChannel.id, type: 'simple' });

      const modal = new ModalBuilder().setCustomId('farewell_simple_message').setTitle('Farewell Message');
      const messageInput = new TextInputBuilder().setCustomId('farewell_message').setLabel('Farewell Message').setPlaceholder('Goodbye {user}! We will miss you.').setStyle(TextInputStyle.Paragraph).setMinLength(1).setMaxLength(2000).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
      return interaction.showModal(modal);
    }

    if (id.startsWith('farewell_channel_container_')) {
      const originalUserId = id.split('_').pop();
      if (interaction.user.id !== originalUserId) {
        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31).addTextDisplayComponents(new TextDisplayBuilder().setContent('Only the command user can use this menu!'));
        return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31).addTextDisplayComponents(new TextDisplayBuilder().setContent('Please select a valid channel.'));
        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      await FarewellConfig.upsert({ guildId: interaction.guild.id, channelId: selectedChannel.id, type: 'container' });

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Farewell Setup - Container'))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Customize your farewell embed, take help of variables.'));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`farewell_field_select_${originalUserId}`)
        .setPlaceholder('Select a field to customize')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Title').setDescription('Set the container title').setValue('title'),
          new StringSelectMenuOptionBuilder().setLabel('Description').setDescription('Set the container description').setValue('description'),
          new StringSelectMenuOptionBuilder().setLabel('Color').setDescription('Set the accent color (hex code)').setValue('color'),
          new StringSelectMenuOptionBuilder().setLabel('Thumbnail').setDescription('Set the thumbnail image URL').setValue('thumbnail'),
          new StringSelectMenuOptionBuilder().setLabel('Image').setDescription('Set the main image URL').setValue('image')
        );
      const selectRow = new ActionRowBuilder().addComponents(selectMenu);
      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`farewell_submit_${originalUserId}`).setLabel('Submit').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('farewell_variables').setLabel('Variables').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`farewell_cancel_${originalUserId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger)
      );

      return interaction.update({ components: [container, selectRow, buttonRow], flags: MessageFlags.IsComponentsV2 });
    }
  }

  return false;
}

module.exports = { handle };
