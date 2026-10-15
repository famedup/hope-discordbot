/**
 * ┌ cashholy (carti)
 * └ modules/interactions/conversion/conversion.js
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
    .setName('conversion')
    .setDescription('Unit and data conversion commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('lb')
        .setDescription('Convert pounds to kilograms')
        .addNumberOption(option =>
          option.setName('pounds')
            .setDescription('The weight in pounds')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('kg')
        .setDescription('Convert kilograms to pounds')
        .addNumberOption(option =>
          option.setName('kilograms')
            .setDescription('The weight in kilograms')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ft')
        .setDescription('Convert feet.inches to centimeters')
        .addNumberOption(option =>
          option.setName('feet')
            .setDescription('The feet value')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('inches')
            .setDescription('The inches value (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cm')
        .setDescription('Convert centimeters to feet and inches')
        .addNumberOption(option =>
          option.setName('centimeters')
            .setDescription('The length in centimeters')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('hexdec')
        .setDescription('Convert hexadecimal to decimal')
        .addStringOption(option =>
          option.setName('hex')
            .setDescription('The hexadecimal value (e.g., FF or 0xFF)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dechex')
        .setDescription('Convert decimal to hexadecimal')
        .addIntegerOption(option =>
          option.setName('decimal')
            .setDescription('The decimal value')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('strbin')
        .setDescription('Convert a string to binary')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('The text to convert')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('binstr')
        .setDescription('Convert binary to a string')
        .addStringOption(option =>
          option.setName('binary')
            .setDescription('The binary string (space or no space separated)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('binint')
        .setDescription('Convert binary to an integer')
        .addStringOption(option =>
          option.setName('binary')
            .setDescription('The binary value (e.g., 1010)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('intbin')
        .setDescription('Convert integers to binary')
        .addIntegerOption(option =>
          option.setName('number')
            .setDescription('The integer to convert')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('encode')
        .setDescription('Encode text to various formats')
        .addStringOption(option =>
          option.setName('format')
            .setDescription('The encoding format')
            .setRequired(true)
            .addChoices(
              { name: 'Base32', value: 'b32' },
              { name: 'Base64', value: 'b64' },
              { name: 'Base85', value: 'b85' },
              { name: 'ROT13', value: 'rot13' },
              { name: 'Hex', value: 'hex' }
            )
        )
        .addStringOption(option =>
          option.setName('text')
            .setDescription('The text to encode')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ascii85')
        .setDescription('Encode text to ASCII85')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('The text to encode')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rot13')
        .setDescription('Encode text to ROT13')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('The text to encode')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('base32')
        .setDescription('Encode text to Base32')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('The text to encode')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('hex')
        .setDescription('Encode text to hexadecimal')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('The text to encode')
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
        content: 'There was an error executing this conversion command!', 
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
