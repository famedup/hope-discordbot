// [dev] cashholy (carti) :: modules/text/animals.js

const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'animals',
    description: 'Show animals commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../services/helpMenu').sendHelp('animals', message);
        }
        const sub = args[0].toLowerCase();
        const subPath = path.join(__dirname, 'animals', `${sub}.js`);
        if (fs.existsSync(subPath)) {
            return require(subPath).execute(message, args.slice(1));
        }
        return require('../../services/helpMenu').sendHelp('animals', message);
    }
};
