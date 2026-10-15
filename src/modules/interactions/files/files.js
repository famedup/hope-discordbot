/* ---
   author : cashholy (carti)
   module : files
   --- */

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const subcommands = new Map();
const subcommandsPath = path.join(__dirname, 'subcommands');

if (fs.existsSync(subcommandsPath)) {
  const subcommandFiles = fs.readdirSync(subcommandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of subcommandFiles) {
    const filePath = path.join(subcommandsPath, file);
    const subcommand = require(filePath);
    if (subcommand.name && subcommand.execute) {
      subcommands.set(subcommand.name, subcommand);
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('files')
    .setDescription('Export server data to files')
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumpsettings')
        .setDescription('Export all server configuration and settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumproles')
        .setDescription('Export a list of all server roles')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumpchannels')
        .setDescription('Export a list of all text channels')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumpvoicechannels')
        .setDescription('Export a list of all voice channels')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumpcategories')
        .setDescription('Export a list of all channel categories')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumpemotes')
        .setDescription('Export all server emojis')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumpmessages')
        .setDescription('Export recent messages from a channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to dump messages from')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of messages to dump (1-100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumphumans')
        .setDescription('Export a list of all human members')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumpbots')
        .setDescription('Export a list of all bot accounts')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumpusers')
        .setDescription('Export all server members (humans + bots)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumpbans')
        .setDescription('Export all banned users')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dumpwarns')
        .setDescription('Export all moderation warnings')
    ),

  async execute(interaction) {
    const subcommandName = interaction.options.getSubcommand();
    const subcommand = subcommands.get(subcommandName);

    if (!subcommand) {
      return interaction.reply({
        content: `Subcommand '${subcommandName}' not found.`,
        ephemeral: true
      });
    }

    try {
      await subcommand.execute(interaction);
    } catch (error) {
      console.error(`Error executing subcommand ${subcommandName}:`, error);
      const errorMessage = { 
        content: 'There was an error executing this dump command!', 
        ephemeral: true 
      };

      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply(errorMessage);
        } else if (interaction.deferred && !interaction.replied) {
          await interaction.editReply(errorMessage);
        }
      } catch (replyError) {
        console.error('Error sending error response:', replyError);
      }
    }
  },
};
