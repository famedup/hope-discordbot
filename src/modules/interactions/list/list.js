// dev: cashholy (carti) | module: list

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
    .setName('list')
    .setDescription('List various server information')
    .addSubcommand(subcommand =>
      subcommand
        .setName('boosters')
        .setDescription('List all server boosters')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('inrole')
        .setDescription('List members in a specific role')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to list members from')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('emojis')
        .setDescription('List all custom emojis in the server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bots')
        .setDescription('List all bots in the server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('admins')
        .setDescription('List all administrators in the server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('invoice')
        .setDescription('List all users in your voice channel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('mods')
        .setDescription('List all moderators in the server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('early')
        .setDescription('List members with Early Supporter badge')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('createpos')
        .setDescription('List members by account creation date')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('roles')
        .setDescription('List all roles in the server')
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
        content: 'There was an error executing this list command!', 
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
