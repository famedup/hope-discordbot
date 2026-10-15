/**
 * ┌ cashholy (carti)
 * └ modules/text/info.js
 */

const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'info',
    description: 'Show information commands',
    aliases: ['information'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('info', message);
        }
        const sub = args[0].toLowerCase();
        const subPath = path.join(__dirname, 'information', `${sub}.js`);
        if (fs.existsSync(subPath)) {
            return require(subPath).execute(message, args.slice(1));
        }
        return require('../../services/helpMenu').sendHelp('info', message);
    }
};
