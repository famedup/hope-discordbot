/** @author cashholy (carti) */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');
const autobumpDb = require('../../../../database/autobump');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} You need **Manage Server** permission!`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        const config = await autobumpDb.getConfig(guild.id);

        if (!config) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} No autobump configuration found!`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        if (!config.enabled) {
            const container = new ContainerBuilder().setAccentColor(0xFEE75C)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.warning} Autobump is already disabled!`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        
        await autobumpDb.updateEnabled(0, guild.id);

        const client = interactionOrMessage.client;
        if (client.autobumpTimers?.has(guild.id)) {
            clearInterval(client.autobumpTimers.get(guild.id));
            client.autobumpTimers.delete(guild.id);
        }

        const container = new ContainerBuilder().setAccentColor(0x57F287)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emojis.success} Autobump has been **disabled**.`)
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
