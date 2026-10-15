// @cashholy(carti) — users

const ui = require('../../../services/ui');
const i18n = require('../../../localization');

module.exports = {
  name: "users",
  description: "Show the total users and servers",
  aliases: [],

  async execute(message, args) {
    const { client } = message;
    const tr = i18n.translator(message);
    const users = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
    const guilds = client.guilds.cache.size;

    await ui.send(message, ui.card({
      title: client.user.username,
      lines: `**${tr('users.users')}** ${tr.num(users)}\n**${tr('users.servers')}** ${tr.num(guilds)}`,
    }));
  },
};
