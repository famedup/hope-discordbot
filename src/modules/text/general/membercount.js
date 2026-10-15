// @cashholy(carti) — membercount

// hope — membercount (mc, members)
// Minimal card: the total as a heading, humans and bots underneath.

const ui = require('../../../services/ui');
const i18n = require('../../../localization');
const { memberCard } = require('../../../services/countCards');

module.exports = {
  name: 'membercount',
  description: 'Shows the member count of the server',
  usage: 'membercount',
  category: 'general',
  aliases: ['mc', 'members'],

  async execute(message) {
    const tr = i18n.translator(message);
    if (!message.guild) return ui.say.error(message, tr('common.guildOnly'));
    return ui.send(message, await memberCard(message.guild, tr));
  },
};
