// dev: cashholy (carti) | module: userinfo

const { SlashCommandBuilder } = require('discord.js');
const { userInfo, send } = require('../../../services/infoEmbeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Shows information about a user')
    .addUserOption(o => o.setName('user').setDescription('The user to look up').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user') || interaction.user;
    return send(interaction, await userInfo(interaction.guild, user));
  },
};
