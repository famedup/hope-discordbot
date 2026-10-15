// [dev] cashholy (carti) :: modules/text/botprofile.js

module.exports = {
    name: 'botprofile',
    description: 'Show bot profile commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('botprofile', message);
        }
        return require('../../services/helpMenu').sendHelp('botprofile', message);
    }
};
