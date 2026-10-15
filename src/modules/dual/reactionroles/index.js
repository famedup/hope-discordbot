/* ---
   author : cashholy (carti)
   module : index
   --- */

const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionroles')
    .setDescription('Setup and manage reaction roles for your server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Start the reaction roles setup wizard')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove an existing reaction roles message')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('The message ID of the reaction roles message')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      const setupModule = require('./subcommands/setup');
      await setupModule.execute(interaction);
    } else if (subcommand === 'remove') {
      const messageId = interaction.options.getString('message_id');
      const ReactionRoles = require('../../../database/schemas/ReactionRoles');

      const config = await ReactionRoles.findOne({
        where: { messageId, guildId: interaction.guild.id }
      });

      if (!config) {
        const notFoundContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### Not Found')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Reaction roles message not found!')
          );
        return interaction.reply({
          components: [notFoundContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      try {
        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (channel) {
          await channel.messages.delete(messageId);
        }
      } catch (error) {
        console.error('Error deleting reaction roles message:', error);
      }

      await ReactionRoles.destroy({
        where: { messageId, guildId: interaction.guild.id }
      });

      const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('### ✅ Removed')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Reaction roles message has been removed.')
        );
      return interaction.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
  }
};
