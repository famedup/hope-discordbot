/* ---
   author : cashholy (carti)
   module : userprofile
   --- */

module.exports = {
    name: 'userprofile',
    description: 'Show user profile commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('userprofile', message);
        }
        return require('../../services/helpMenu').sendHelp('userprofile', message);
    }
};
