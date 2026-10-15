/** @author cashholy (carti) */

module.exports = {
    name: 'vanity',
    description: 'Show vanity roles commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('vanity', message);
        }
        const hybrid = require('../dual/vanityroles/vanityroles');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../services/helpMenu').sendHelp('vanity', message);
    }
};
