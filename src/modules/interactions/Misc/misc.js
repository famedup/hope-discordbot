/**
 * @file misc.js
 * @developer cashholy (carti)
 */

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
    .setName('misc')
    .setDescription('Miscellaneous utility commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('define')
        .setDescription('Get Urban Dictionary definition of a word')
        .addStringOption(option =>
          option.setName('word')
            .setDescription('The word to define')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('matrix')
        .setDescription('Generate a dot matrix of an image')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('Image URL (leave empty to use your avatar)')
            .setRequired(false)
        )
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to get avatar from')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('size')
        .setDescription('Shows pp size (for fun)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check (defaults to yourself)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('calc')
        .setDescription('Interactive calculator with buttons')
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
        content: 'There was an error executing this misc command!', 
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
