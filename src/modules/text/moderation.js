/** @author cashholy (carti) */

const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'moderation',
    description: 'Show moderation commands',
    aliases: ['mod'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('moderation', message);
        }
        const sub = args[0].toLowerCase();
        const subPath = path.join(__dirname, 'moderation', `${sub}.js`);
        if (fs.existsSync(subPath)) {
            return require(subPath).execute(message, args.slice(1));
        }
        return require('../../services/helpMenu').sendHelp('moderation', message);
    }
};
