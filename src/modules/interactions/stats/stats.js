// dev: cashholy (carti) | module: stats

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
    .setName('stats')
    .setDescription('Server statistics and information commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('permissions')
        .setDescription('Show a user\'s permissions in the server')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check permissions for')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rolecall')
        .setDescription('Count the number of users who have a specific role')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to count members for')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rolecount')
        .setDescription('Count the total number of roles on the server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('roleinfo')
        .setDescription('Get detailed information about a role')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to get information about')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('roleperms')
        .setDescription('Show all permissions that a specific role has')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to check permissions for')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('topic')
        .setDescription('Display the topic/description of a channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to get the topic from')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('channelinfo')
        .setDescription('Get detailed information about a channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to get information about')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('emojiinfo')
        .setDescription('Get information about an emoji')
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('The emoji to get information about')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('emojistats')
        .setDescription('Track and display emoji usage statistics across the server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('emptyroles')
        .setDescription('Show all roles that have zero members assigned to them')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('firstjoins')
        .setDescription('Show the first users who joined the server')
        .addIntegerOption(option =>
          option.setName('count')
            .setDescription('Number of users to show (default: 10)')
            .setMinValue(1)
            .setMaxValue(50)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('joined')
        .setDescription('Check when a specific user joined the server')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check join date for')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('joinedatpos')
        .setDescription('Show which user joined at a specific position')
        .addIntegerOption(option =>
          option.setName('position')
            .setDescription('The join position to check')
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('joinpos')
        .setDescription('Show the join position of a specific user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check join position for')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('lastjoins')
        .setDescription('Show the most recent users who joined the server')
        .addIntegerOption(option =>
          option.setName('count')
            .setDescription('Number of users to show (default: 10)')
            .setMinValue(1)
            .setMaxValue(50)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('listchannels')
        .setDescription('Display a list of all channels in the server')
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
        content: 'There was an error executing this stats command!', 
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
