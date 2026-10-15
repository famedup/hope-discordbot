/**
 * ┌ cashholy (carti)
 * └ modules/text/information/ping.js
 */

const { MessageFlags } = require('discord.js');
const { buildPingContainer } = require('../../../services/pingCard');
const i18n = require('../../../localization');

module.exports = {
    name: 'ping',
    description: 'Check the bot\'s latency',

    async execute(message) {
        const latency = Math.round(message.client.ws.ping);
        await message.reply({
            components: [buildPingContainer(latency, i18n.translator(message))],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] },
        });
    },
};
