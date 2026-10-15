/**
 * @file tracking.js
 * @developer cashholy (carti)
 */

module.exports = {
    name: 'tracking',
    description: 'Show tracking commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('tracking', message);
        }
        return require('../../services/helpMenu').sendHelp('tracking', message);
    }
};
