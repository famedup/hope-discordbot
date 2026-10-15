// dev: cashholy (carti) | module: avgping

const ui = require('../../../services/ui');
const sequelize = require('../../../database/sequelize');
const i18n = require('../../../localization');

module.exports = {
    name: 'avgping',
    description: 'Check the bot\'s average latency over multiple samples',
    aliases: ['averageping', 'avglatency'],

    async execute(message) {
        const tr = i18n.translator(message);
        const sent = await message.reply({ content: tr('avgping.calculating'), fetchReply: true });

        const sampleCount = 5;
        const dbSamples = [];

        for (let i = 0; i < sampleCount; i++) {
            const start = Date.now();
            try { await sequelize.query('SELECT 1'); } catch (_) {}
            dbSamples.push(Date.now() - start);
            if (i < sampleCount - 1) await new Promise(r => setTimeout(r, 100));
        }

        const roundTrip = sent.createdTimestamp - message.createdTimestamp;
        const avgDb = +(dbSamples.reduce((a, b) => a + b, 0) / sampleCount).toFixed(1);
        const avg = +((avgDb + roundTrip) / 2).toFixed(1);

        const container = ui.card({
            title: tr('avgping.title'),
            lines: [
                tr('avgping.summary', { avg: tr.num(avg), samples: sampleCount }),
                tr('avgping.detail', { roundTrip: tr.num(roundTrip), db: tr.num(avgDb) }),
            ],
        });

        await sent.edit({
            content: null,
            components: [container],
            flags: require('discord.js').MessageFlags.IsComponentsV2
        });
    },
};
