/*
 * Developed by cashholy (carti)
 * File: modules/text/information/userinfo.js
 */

const { userInfo, send } = require('../../../services/infoEmbeds');
const i18n = require('../../../localization');

module.exports = {
  name: 'userinfo',
  description: 'Shows information about a user',
  aliases: ['ui', 'user', 'whois'],

  async execute(message, args) {
    const { client, guild } = message;
    let target = message.mentions.users.first();
    if (!target && args[0]) {
      const id = args[0].replace(/[<@!>]/g, '');
      target = await client.users.fetch(id).catch(() => null);
      if (!target) {
        const q = args.join(' ').toLowerCase();
        target = guild.members.cache.find(m => m.user.username.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q))?.user;
      }
    }
    return send(message, await userInfo(guild, target || message.author, i18n.translator(message)));
  },
};
