// ▛▀ cashholy (carti) ▀▜

const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'pfps',
    description: 'Show profile pictures commands',
    aliases: ['profilepictures'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('pfps', message);
        }
        const sub = args[0].toLowerCase();
        const subPath = path.join(__dirname, 'pfps', `${sub}.js`);
        if (fs.existsSync(subPath)) {
            return require(subPath).execute(message, args.slice(1));
        }
        return require('../../services/helpMenu').sendHelp('pfps', message);
    }
};
