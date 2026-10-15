// »» engineered by cashholy (carti) ««

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
    .setName('moderation')
    .setDescription('Moderation commands')
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('unblock')
        .setDescription('Reallow users to send messages')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to unblock')
            .setRequired(true)
        )
    )
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('unblind')
        .setDescription('Reallow users to see a channel')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to unblind')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to unhide (defaults to current)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('kick')
        .setDescription('Kick users from the server')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to kick')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for kicking')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ban')
        .setDescription('Ban users from the server')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to ban')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for banning')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('delete_messages')
            .setDescription('Delete messages from the last X days (0-7)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(7)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('softban')
        .setDescription('Softban users from the server (ban then unban to delete messages)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to softban')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for softban')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('delete_messages')
            .setDescription('Delete messages from the last X days (0-7)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(7)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unban')
        .setDescription('Unban a previously banned user')
        .addStringOption(option =>
          option.setName('user_id')
            .setDescription('The ID of the user to unban')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for unbanning')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('slowmode')
        .setDescription('Set the slowmode for a channel')
        .addIntegerOption(option =>
          option.setName('seconds')
            .setDescription('Slowmode duration in seconds (0 to disable)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(21600)
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to set slowmode (defaults to current)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('tempban')
        .setDescription('Temporarily ban users')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to temporarily ban')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('duration')
            .setDescription('Duration (e.g., 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for tempban')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('delete_messages')
            .setDescription('Delete messages from the last X days (0-7)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(7)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('mute')
        .setDescription('Mute users for a duration')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to mute')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('duration')
            .setDescription('Duration (e.g., 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for muting')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unmute')
        .setDescription('Unmute muted users')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to unmute')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('temprole')
        .setDescription('Temporarily add roles to users')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to give the role')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to add')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('duration')
            .setDescription('Duration (e.g., 1h, 30m, 1d)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for temporary role')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rolegive')
        .setDescription('Give a role to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to give the role to')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to give')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('roleremove')
        .setDescription('Remove a role from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to remove the role from')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to remove')
            .setRequired(true)
        )
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
        content: 'There was an error executing this moderation command!', 
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
