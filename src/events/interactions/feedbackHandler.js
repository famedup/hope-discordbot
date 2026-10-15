// ─── cashholy (carti) · developer ───

const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType
} = require('discord.js');
const feedbackDb = require('../../database/feedback');

function isValidImageUrl(url) {
  if (!url || !url.trim()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'attachment:';
  } catch {
    return false;
  }
}

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id === 'open_feedback_modal') {
      const modal = new ModalBuilder()
        .setCustomId('feedback_modal')
        .setTitle(`${interaction.guild.name} - Service Feedback`);

      const ratingInput = new TextInputBuilder()
        .setCustomId('feedback_rating')
        .setLabel('Rate our service (1-5)')
        .setPlaceholder('Enter a number from 1 to 5')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(1)
        .setRequired(true);

      const feedbackInput = new TextInputBuilder()
        .setCustomId('feedback_text')
        .setLabel('Your feedback')
        .setPlaceholder('Tell us about your experience...')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(10)
        .setMaxLength(2000)
        .setRequired(true);

      const imageInput = new TextInputBuilder()
        .setCustomId('feedback_image')
        .setLabel('Image URL (optional)')
        .setPlaceholder('https://example.com/image.png')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(ratingInput),
        new ActionRowBuilder().addComponents(feedbackInput),
        new ActionRowBuilder().addComponents(imageInput)
      );

      await interaction.showModal(modal);
      return true;
    }

    if (id === 'feedback_setup_skip_log') {
      const setupData = interaction.client._feedbackSetup?.[interaction.user.id];
      if (!setupData) {
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Setup session expired. Please run `/feedback setup` again.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      try {
        await feedbackDb.setConfig(interaction.guildId, setupData.reviewChannelId, null);
        delete interaction.client._feedbackSetup[interaction.user.id];

        const reviewChannel = interaction.guild.channels.cache.get(setupData.reviewChannelId);
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Feedback Setup Complete')
          )
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Review Channel:** ${reviewChannel ? reviewChannel.toString() : `<#${setupData.reviewChannelId}>`}\n` +
              `**Log Channel:** None\n\n` +
              `Use \`/feedback panel\` to send the feedback panel to your review channel.`
            )
          );

        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('Feedback setup error:', error);
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Failed to save configuration. Please try again.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return true;
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (id === 'feedback_setup_review') {
      const selectedChannel = interaction.channels.first();
      if (!selectedChannel) {
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Please select a valid channel.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      interaction.client._feedbackSetup = interaction.client._feedbackSetup || {};
      interaction.client._feedbackSetup[interaction.user.id] = {
        reviewChannelId: selectedChannel.id
      };

      const skipButton = new ButtonBuilder()
        .setCustomId('feedback_setup_skip_log')
        .setLabel('Skip (No log channel)')
        .setStyle(ButtonStyle.Secondary);

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('# Feedback System Setup\n**Step 2 of 2**')
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Review channel: <#${selectedChannel.id}>\n\nSelect a **log channel** for detailed submission logs, or skip:`)
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('feedback_setup_log')
              .setPlaceholder('Select log channel (optional)')
              .setChannelTypes(ChannelType.GuildText)
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(skipButton)
        );

      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
      return true;
    }

    if (id === 'feedback_setup_log') {
      const selectedChannel = interaction.channels.first();
      const setupData = interaction.client._feedbackSetup?.[interaction.user.id];

      if (!setupData) {
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Setup session expired. Please run `/feedback setup` again.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      if (!selectedChannel) {
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Please select a valid channel.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      try {
        await feedbackDb.setConfig(interaction.guildId, setupData.reviewChannelId, selectedChannel.id);
        delete interaction.client._feedbackSetup[interaction.user.id];

        const reviewChannel = interaction.guild.channels.cache.get(setupData.reviewChannelId);
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Feedback Setup Complete')
          )
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Review Channel:** ${reviewChannel ? reviewChannel.toString() : `<#${setupData.reviewChannelId}>`}\n` +
              `**Log Channel:** ${selectedChannel.toString()}\n\n` +
              `Use \`/feedback panel\` to send the feedback panel to your review channel.`
            )
          );

        await interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.error('Feedback setup error:', error);
        await interaction.update({
          components: [
            new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Failed to save configuration. Please try again.')
              )
          ],
          flags: MessageFlags.IsComponentsV2
        });
      }
      return true;
    }
  }

  if (interaction.isModalSubmit()) {
    if (id === 'feedback_modal') {
      const rating = interaction.fields.getTextInputValue('feedback_rating');
      const feedbackText = interaction.fields.getTextInputValue('feedback_text');
      const imageUrl = interaction.fields.getTextInputValue('feedback_image');

      const ratingNum = parseInt(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return interaction.reply({
          content: 'Rating must be a number between 1 and 5!',
          flags: MessageFlags.Ephemeral
        });
      }

      const config = await feedbackDb.getConfig(interaction.guildId);

      if (!config) {
        return interaction.reply({
          content: 'Feedback system is not configured!',
          flags: MessageFlags.Ephemeral
        });
      }

      const reviewChannel = interaction.guild.channels.cache.get(config.review_channel_id);
      if (!reviewChannel) {
        return interaction.reply({
          content: 'Review channel not found!',
          flags: MessageFlags.Ephemeral
        });
      }

      const starRating = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);

      const reviewSection = new SectionBuilder();
      reviewSection.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# New Service Review\n\n> "${feedbackText}"\n\n**Rating:** ${starRating} (${ratingNum}/5)\n**Reviewed by:** ${interaction.user.username}\n**User ID:** ${interaction.user.id}`)
      );
      reviewSection.setThumbnailAccessory(
        new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL())
      );

      const reviewContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addSectionComponents(reviewSection);

      if (imageUrl && isValidImageUrl(imageUrl)) {
        reviewContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
          .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems([
              new MediaGalleryItemBuilder()
                .setURL(imageUrl)
                .setDescription('Attached Image')
            ])
          );
      }

      reviewContainer
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Thank you for your feedback! Your review helps us improve our services.')
        );

      const nextButton = new ButtonBuilder()
        .setCustomId('open_feedback_modal')
        .setLabel('Submit Your Review')
        .setStyle(ButtonStyle.Primary);

      reviewContainer.addActionRowComponents(new ActionRowBuilder().addComponents(nextButton));

      try {
        await reviewChannel.send({
          components: [reviewContainer],
          flags: MessageFlags.IsComponentsV2
        });

        if (config.log_channel_id) {
          const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
          if (logChannel) {
            const logContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# New Review Submitted')
              )
              .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**User:** ${interaction.user.username} (${interaction.user.id})\n**Rating:** ${starRating} (${ratingNum}/5)\n**Feedback:** ${feedbackText}\n**Server:** ${interaction.guild.name}`)
              );

            await logChannel.send({
              components: [logContainer],
              flags: MessageFlags.IsComponentsV2
            });
          }
        }

        return interaction.reply({
          content: 'Thank you for your feedback! It has been submitted successfully.',
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        console.error('Feedback submission error:', error);
        return interaction.reply({
          content: 'An error occurred while submitting your feedback!',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }

  return false;
}

module.exports = { handle };
