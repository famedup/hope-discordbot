// ─── cashholy (carti) · developer ───

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ignore')
    .setDescription('Manage ignored commands, channels, users, and bypass users')
    .addSubcommandGroup(group =>
      group
        .setName('command')
        .setDescription('Manage ignored commands')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a command to the ignore list')
            .addStringOption(option =>
              option
                .setName('command')
                .setDescription('The command name to ignore')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a command from the ignore list')
            .addStringOption(option =>
              option
                .setName('command')
                .setDescription('The command name to unignore')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('show')
            .setDescription('Display all ignored commands')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('channel')
        .setDescription('Manage ignored channels')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a channel to the ignore list')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('The channel to ignore')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a channel from the ignore list')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('The channel to unignore')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('show')
            .setDescription('Display all ignored channels')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('user')
        .setDescription('Manage ignored users')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a user to the ignore list')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('The user to ignore')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a user from the ignore list')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('The user to unignore')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('show')
            .setDescription('Display all ignored users')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('bypass')
        .setDescription('Manage bypass users (users who can bypass ignore settings)')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a user to the bypass list')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('The user to add to bypass')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a user from the bypass list')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('The user to remove from bypass')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('show')
            .setDescription('Display all bypass users')
        )
    ),

  async execute(interaction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    const subcommandFile = path.join(__dirname, 'subcommands', `${subcommandGroup}-${subcommand}.js`);

    if (fs.existsSync(subcommandFile)) {
      const subcommandModule = require(subcommandFile);
      await subcommandModule.execute(interaction);
    }
  }
};
