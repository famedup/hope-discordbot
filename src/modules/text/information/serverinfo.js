// [dev] cashholy (carti) :: modules/text/information/serverinfo.js

const { serverInfo, send } = require('../../../services/infoEmbeds');
const i18n = require('../../../localization');

module.exports = {
  name: 'serverinfo',
  description: 'Shows information about the server',
  aliases: ['sinfo', 'si'],

  async execute(message) {
    return send(message, await serverInfo(message.guild, i18n.translator(message)));
  },
};
