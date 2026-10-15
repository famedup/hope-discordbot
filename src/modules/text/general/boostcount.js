/**
 * ┌ cashholy (carti)
 * └ modules/text/general/boostcount.js
 */

// hope — boostcount (bc)
// Minimal card: the boost total as a heading, server level and booster count underneath.
// Note: "boosts" is already an alias of the boost-message command, so it is not used here.

const ui = require('../../../services/ui');
const i18n = require('../../../localization');
const { boostCard } = require('../../../services/countCards');

module.exports = {
  name: 'boostcount',
  description: 'Shows the boost count of the server',
  usage: 'boostcount',
  category: 'general',
  aliases: ['bc'],

  async execute(message) {
    const tr = i18n.translator(message);
    if (!message.guild) return ui.say.error(message, tr('common.guildOnly'));
    return ui.send(message, await boostCard(message.guild, tr));
  },
};
