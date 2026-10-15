/** @author cashholy (carti) */

module.exports = {
    name: 'social',
    description: 'Show social commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('social', message);
        }
        return require('../../services/helpMenu').sendHelp('social', message);
    }
};
