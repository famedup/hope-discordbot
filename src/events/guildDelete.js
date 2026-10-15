// @cashholy(carti) — guildDelete

const botLogger = require('../services/botLogger');

module.exports = {
    name: 'guildDelete',

    async execute(guild, client) {
        botLogger.logGuildLeave(guild, client).catch(() => {});
    }
};
