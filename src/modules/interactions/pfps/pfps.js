/**
 * @file pfps.js
 * @developer cashholy (carti)
 */

const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pfp")
    .setDescription("Profile picture galleries")
    .addSubcommand(subcommand =>
      subcommand
        .setName("anime")
        .setDescription("Browse anime profile pictures")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("male")
        .setDescription("Browse male profile pictures")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("female")
        .setDescription("Browse female profile pictures")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const subcommandFile = path.join(__dirname, "subcommands", `${subcommand}.js`);

    if (fs.existsSync(subcommandFile)) {
      const subcommandModule = require(subcommandFile);
      await subcommandModule.execute(interaction);
    }
  }
};
