// »» engineered by cashholy (carti) ««

const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'fun',
    description: 'Show fun commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('fun', message);
        }
        const sub = args[0].toLowerCase();
        const subPath = path.join(__dirname, 'fun', `${sub}.js`);
        if (fs.existsSync(subPath)) {
            return require(subPath).execute(message, args.slice(1));
        }
        return require('../../services/helpMenu').sendHelp('fun', message);
    }
};
