/**
 * ┌ cashholy (carti)
 * └ modules/dual/media/media.js
 */

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('media')
    .setDescription('Setup and manage media-only channels')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set up a media-only channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to set as media-only')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove the media-only channel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('View current media channel configuration')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bypass')
        .setDescription('Manage media bypass list')
        .addStringOption(option =>
          option
            .setName('option')
            .setDescription('Choose an action')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'Show', value: 'show' }
            )
        )
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to add/remove (ignored for show)')
            .setRequired(true)
        )
    ),

  name: 'media',
  aliases: [],
  description: 'Setup and manage media-only channels',
  category: 'moderation',
  allowMediaChannel: true,

  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();

    let subcommand;

    if (isSlash) {
      subcommand = interactionOrMessage.options.getSubcommand();
    } else {
      subcommand = args[0]?.toLowerCase();
      args = args.slice(1);
    }

    if (!subcommand || !['setup', 'remove', 'config', 'bypass'].includes(subcommand)) {
      return require('../../../services/helpMenu').sendHelp('media', interactionOrMessage);
    }

    const subcommandFile = require(`./subcommands/${subcommand}`);
    return subcommandFile.execute(interactionOrMessage, args);
  }
};
