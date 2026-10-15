// [dev] cashholy (carti) :: modules/interactions/information/serverinfo.js

const { SlashCommandBuilder } = require('discord.js');
const { serverInfo, send } = require('../../../services/infoEmbeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Shows information about the server'),

  async execute(interaction) {
    await interaction.deferReply();
    return send(interaction, await serverInfo(interaction.guild));
  },
};
