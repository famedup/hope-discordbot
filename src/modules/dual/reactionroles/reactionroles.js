// @cashholy(carti) — reactionroles

const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');

module.exports = {
  name: 'reactionroles',
  aliases: ['rr'],
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

  async execute(interactionOrMessage, args) {
    const isSlash = typeof interactionOrMessage.isCommand === 'function' && interactionOrMessage.isCommand();

    if (isSlash) {
      const subcommand = interactionOrMessage.options.getSubcommand();

      if (subcommand === 'setup') {
        const setupModule = require('./subcommands/setup');
        return setupModule.execute(interactionOrMessage);
      } else if (subcommand === 'remove') {
        const messageId = interactionOrMessage.options.getString('message_id');
        return this._remove(interactionOrMessage, messageId);
      }
    } else {
      if (!args || !args.length) {
        return require('../../../services/helpMenu').sendHelp('reactionroles', interactionOrMessage);
      }
      const sub = args[0].toLowerCase();
      if (sub === 'setup') {
        const setupModule = require('./subcommands/setup');
        return setupModule.execute(interactionOrMessage);
      } else if (sub === 'remove') {
        const messageId = args[1];
        if (!messageId) {
          return interactionOrMessage.reply('Please provide a message ID. Usage: `.rr remove <message_id>`');
        }
        return this._remove(interactionOrMessage, messageId);
      } else {
        return require('../../../services/helpMenu').sendHelp('reactionroles', interactionOrMessage);
      }
    }
  },

  async _remove(ctx, messageId) {
    const ReactionRoles = require('../../../database/schemas/ReactionRoles');
    const isSlash = typeof ctx.isCommand === 'function' && ctx.isCommand();

    const config = await ReactionRoles.findOne({
      where: { messageId, guildId: ctx.guild.id }
    });

    if (!config) {
      if (isSlash) {
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
        return ctx.reply({
          components: [notFoundContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }
      return ctx.reply('Reaction roles message not found!');
    }

    try {
      const channel = ctx.guild.channels.cache.get(config.channelId);
      if (channel) {
        await channel.messages.delete(messageId);
      }
    } catch (error) {
      console.error('Error deleting reaction roles message:', error);
    }

    await ReactionRoles.destroy({
      where: { messageId, guildId: ctx.guild.id }
    });

    if (isSlash) {
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
      return ctx.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    return ctx.reply('✅ Reaction roles message removed!');
  }
};
