// dev: cashholy (carti) | module: reactionroles

module.exports = {
    name: 'reactionroles',
    description: 'Show reaction roles commands',
    aliases: ['rr'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('reactionroles', message);
        }
        const hybrid = require('../dual/reactionroles/reactionroles');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../services/helpMenu').sendHelp('reactionroles', message);
    }
};
