/* ---
   author : cashholy (carti)
   module : giveaway
   --- */

const { SlashCommandBuilder } = require('discord.js');
const { MAX_WINNERS } = require('../../../services/giveawayUI');

const SUBCOMMANDS = ['start', 'end', 'reroll'];

// Direct shortcuts: `gstart 1m 1 prize`, `gwend <id>`, `greroll <id>` ...
const SHORTCUTS = {
  gstart: 'start',
  gwstart: 'start',
  'giveaway-start': 'start',
  gend: 'end',
  gwend: 'end',
  'giveaway-end': 'end',
  greroll: 'reroll',
  gwreroll: 'reroll',
  'giveaway-reroll': 'reroll',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('Duration (e.g., 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('winners')
            .setDescription('Number of winners')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(MAX_WINNERS)
        )
        .addStringOption(option =>
          option
            .setName('prize')
            .setDescription('The prize for the giveaway')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('The giveaway message ID')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reroll')
        .setDescription('Reroll a giveaway')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('The giveaway message ID')
            .setRequired(true)
        )
    ),

  name: 'giveaway',
  aliases: ['g', 'gw', ...Object.keys(SHORTCUTS)],
  description: 'Manage giveaways',
  category: 'giveaway',

  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();

    let subcommand = null;

    if (isSlash) {
      subcommand = interactionOrMessage.options.getSubcommand();
    } else {
      // gstart / gwstart / gend ... -> the alias itself tells us the subcommand
      const invoked = (interactionOrMessage.invokedAs || '').toLowerCase();
      if (SHORTCUTS[invoked]) {
        subcommand = SHORTCUTS[invoked];
      } else if (SUBCOMMANDS.includes(args[0]?.toLowerCase())) {
        // giveaway start ... / g start ... / gw start ...
        subcommand = args[0].toLowerCase();
        args = args.slice(1);
      }
    }

    if (!subcommand) {
      return require('../../../services/helpMenu').sendHelp('giveaway', interactionOrMessage);
    }

    const subcommandFile = require(`./subcommands/${subcommand}`);
    return subcommandFile.execute(interactionOrMessage, args);
  }
};
