/* ---
   author : cashholy (carti)
   module : uptime
   --- */

const ui = require('../../../services/ui');
const emojis = require('../../../media/emojis.json');
const i18n = require('../../../localization');

module.exports = {
    name: 'uptime',
    description: 'Check how long the bot has been online',
    aliases: ['up', 'online'],

    async execute(message) {
        const { client } = message;
        const tr = i18n.translator(message);

        const uptimeMs = client.uptime;
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;

        const uptimeFull = tr.duration(uptimeMs);
        const startTime = Math.floor((Date.now() - uptimeMs) / 1000);

        const wsLatency = client.ws.ping;
        const dot = wsLatency < 100 ? emojis.online : wsLatency < 200 ? emojis.idle : emojis.dnd;

        await ui.send(message, ui.card({
            title: tr('uptime.title'),
            lines: [
                tr('uptime.since', { uptime: uptimeFull, since: `<t:${startTime}:R>` }),
                `${dot} ${tr('uptime.websocket')} \`${wsLatency}ms\``,
            ],
        }));
    },
};
