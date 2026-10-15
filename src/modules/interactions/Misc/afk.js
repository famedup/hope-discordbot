// ▛▀ cashholy (carti) ▀▜

const { SlashCommandBuilder } = require('discord.js');
const ui = require('../../../services/ui');
const afk = require('../../../services/afkTools');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set yourself as AFK (the reason is optional)')
        .addStringOption(o => o.setName('reason').setDescription('Why you are away').setRequired(false).setMaxLength(200))
        .addBooleanOption(o => o.setName('dm').setDescription('DM me when someone mentions me').setRequired(false)),

    async execute(interaction) {
        const checked = afk.cleanReason(interaction.options.getString('reason'));
        if (!checked.ok) return ui.say.error(interaction, checked.error);

        const { updated } = await afk.setAfk({
            guildId: interaction.guildId, userId: interaction.user.id,
            reason: checked.reason, dm: interaction.options.getBoolean('dm') ?? false,
        });
        const make = updated ? afk.updatedMessage : afk.setMessage;
        return interaction.reply(afk.body(make(interaction.user.id, checked.reason)));
    },
};
