/*
 * Developed by cashholy (carti)
 * File: modules/dual/reactionroles/subcommands/setup.js
 */

const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const ReactionRoles = require('../../../../database/schemas/ReactionRoles');

module.exports = {
  name: 'reactionroles',
  description: 'Setup and manage reaction roles',
  
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      const noPermContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### Missing Permission')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('You need **Manage Guild** permission to use this command.')
        );
      return interaction.reply({
        components: [noPermContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    
    if (!interaction.client.reactionRolesSetup) {
      interaction.client.reactionRolesSetup = new Map();
    }

    await this.step1(interaction);
  },

  async step1(interaction) {
    const userId = interaction.user?.id ?? interaction.author?.id;
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Reaction Roles Setup - Step 1')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Select the channel where the reaction roles message will be posted:')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(`rr_channel_select_${userId}`)
            .setPlaceholder('Select a text channel')
            .setChannelTypes(ChannelType.GuildText)
            .setMinValues(1)
            .setMaxValues(1)
        )
      );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },

  async step2(interaction, channelId) {
    
    if (!interaction.client.reactionRolesSetup) {
      interaction.client.reactionRolesSetup = new Map();
    }

    interaction.client.reactionRolesSetup.set(interaction.user.id, {
      guildId: interaction.guild.id,
      channelId: channelId,
      emojiRolePairs: []
    });

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Reaction Roles Setup - Step 2')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Configure your embed message:**\n\nClick "Add Emoji-Role" to add pairs, or "Continue" to proceed to review.')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`rr_add_pair_${interaction.user.id}`)
            .setLabel('Add Emoji-Role')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`rr_step2_continue_${interaction.user.id}`)
            .setLabel('Continue')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`rr_setup_cancel`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      );

    return interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },

  async step3(interaction) {
    
    if (!interaction.client.reactionRolesSetup?.has(interaction.user.id)) {
      return interaction.reply({
        content: 'Session expired. Please run `/reactionroles setup` again.',
        flags: MessageFlags.Ephemeral
      });
    }

    const session = interaction.client.reactionRolesSetup.get(interaction.user.id);

    if (session.emojiRolePairs.length === 0) {
      return interaction.reply({
        content: 'You must add at least one emoji-role pair!',
        flags: MessageFlags.Ephemeral
      });
    }

    
    let pairsSummary = '';
    for (const pair of session.emojiRolePairs) {
      pairsSummary += `${pair.emoji} → <@&${pair.roleId}>\n`;
    }

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Reaction Roles Setup - Step 3')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Channel:** <#${session.channelId}>\n\n` +
          `**Emoji-Role Pairs:**\n${pairsSummary}\n\n` +
          `Review your settings and confirm to post the message.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`rr_setup_confirm_${interaction.user.id}`)
            .setLabel('Confirm & Post')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`rr_setup_back_${interaction.user.id}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`rr_setup_cancel`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      );

    return interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
