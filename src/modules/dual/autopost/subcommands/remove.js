// »» engineered by cashholy (carti) ««

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');
const autopostDb = require('../../../../database/autopost');
const { stopAutopostTimer } = require('../autopostTimer');

const VALID_CATEGORIES = ['female', 'male', 'anime', 'random'];

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} You need **Manage Server** permission!`)
                );
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        let category;

        if (isSlash) {
            category = interactionOrMessage.options.getString('category');
        } else {
            category = args[0]?.toLowerCase();
        }

        if (!category || !VALID_CATEGORIES.includes(category)) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} Invalid category! Choose from: \`female\`, \`male\`, \`anime\`, \`random\``)
                );
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        const config = await autopostDb.getConfig(guild.id, category);

        if (!config) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} No autopost found for **${category}** in this server.`)
                );
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        await autopostDb.deleteConfig(guild.id, category);

        const client = interactionOrMessage.client;
        stopAutopostTimer(client, guild.id, category);

        const container = new ContainerBuilder().setAccentColor(0x57F287)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${emojis.success} Autopost Removed`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Category:** ${category}\n-# No longer posting images`)
            );

        return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
