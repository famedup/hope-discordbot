// ─── cashholy (carti) · developer ───

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
    .setName('fun')
    .setDescription('Fun and entertainment commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('meme')
        .setDescription('Send a meme from Reddit')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('hack')
        .setDescription('Pretend to hack someone\'s discord account (for fun)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to "hack"')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('howgay')
        .setDescription('Check how gay someone is (just for fun)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('howdumb')
        .setDescription('Check someone\'s dumb rate (just for fun)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('simprate')
        .setDescription('Check how much of a simp someone is')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check (defaults to yourself)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('kill')
        .setDescription('Kill someone (just for fun)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to kill')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('lick')
        .setDescription('Lick someone (just for fun)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to lick')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dare')
        .setDescription('Get a random dare challenge')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('truth')
        .setDescription('Get a random truth question')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('pickup')
        .setDescription('Get a random pickup line')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('nitro')
        .setDescription('Generate a fake nitro gift link')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('token')
        .setDescription('Generate a fake discord token')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user (defaults to yourself)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('texttoemoji')
        .setDescription('Convert text to emojis')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('The text to convert')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rickroll')
        .setDescription('Detect if a URL is a rickroll')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('The URL to check')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rizz')
        .setDescription('Get a random rizz line for yourself or someone else')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to rizz up')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('wizz')
        .setDescription('Fake server destruction command')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('fakemessage')
        .setDescription('Generate a fake Discord message card')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to impersonate in the message')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message')
            .setDescription('The message content')
            .setRequired(true)
            .setMaxLength(500)
        )
        .addStringOption(option =>
          option.setName('theme')
            .setDescription('Card theme (default: dark)')
            .setRequired(false)
            .addChoices(
              { name: 'Dark', value: 'dark' },
              { name: 'Light', value: 'light' },
              { name: 'AMOLED', value: 'amoled' },
              { name: 'Midnight', value: 'midnight' },
              { name: 'Forest', value: 'forest' },
              { name: 'Ocean', value: 'ocean' },
              { name: 'Sunset', value: 'sunset' },
              { name: 'Purple', value: 'purple' }
            )
        )
        .addStringOption(option =>
          option.setName('timestamp')
            .setDescription('Custom timestamp (e.g., 12:43 AM)')
            .setRequired(false)
            .setMaxLength(20)
        )
        .addBooleanOption(option =>
          option.setName('app')
            .setDescription('Show APP badge')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option.setName('verified')
            .setDescription('Show verified badge')
            .setRequired(false)
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
        content: 'There was an error executing this fun command!', 
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
