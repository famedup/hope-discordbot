// ▛▀ cashholy (carti) ▀▜

const { SlashCommandBuilder } = require('discord.js');
const ui = require('../../../services/ui');
const sequelize = require('../../../database/sequelize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency'),

    async execute(interaction) {
        await interaction.deferReply();

        const wsLatency = interaction.client.ws.ping;

        const t0 = Date.now();
        try { await sequelize.query('SELECT 1'); } catch (_) {}
        const readMs = (Date.now() - t0).toFixed(2);

        const t1 = Date.now();
        try { await sequelize.query('SELECT NOW()'); } catch (_) {}
        const writeMs = (Date.now() - t1).toFixed(2);

        const t2 = Date.now();
        try { await sequelize.query('SELECT 1+1'); } catch (_) {}
        const deleteMs = (Date.now() - t2).toFixed(2);

        await ui.send(interaction, ui.card({
            title: 'Ping',
            lines: [
                `**Websocket** \`${wsLatency}ms\``,
                `**Database** read \`${readMs}ms\` · write \`${writeMs}ms\` · delete \`${deleteMs}ms\``,
            ],
        }));
    },
};
