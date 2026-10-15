//
//  Made with care by cashholy (carti)
//

const { SlashCommandBuilder } = require("discord.js");
const ui = require('../../../services/ui');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("users")
    .setDescription("Show the total users and servers"),

  async execute(interaction) {
    const { client } = interaction;
    const users = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
    const guilds = client.guilds.cache.size;

    await ui.send(interaction, ui.card({
      title: client.user.username,
      lines: `**Users** ${users.toLocaleString()}\n**Servers** ${guilds.toLocaleString()}`,
    }));
  },
};
