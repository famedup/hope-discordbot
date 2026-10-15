/** @author cashholy (carti) */

const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'files',
    description: 'Show server files commands',
    aliases: ['serverfiles'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('files', message);
        }
        const sub = args[0].toLowerCase();
        const subPath = path.join(__dirname, 'dump', `${sub}.js`);
        if (fs.existsSync(subPath)) {
            return require(subPath).execute(message, args.slice(1));
        }
        return require('../../services/helpMenu').sendHelp('files', message);
    }
};
