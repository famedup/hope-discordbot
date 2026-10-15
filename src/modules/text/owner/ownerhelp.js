// »» engineered by cashholy (carti) ««

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../../settings');

module.exports = {
    name: 'ownerhelp',
    description: 'List all owner-only commands',
    aliases: ['ohelp', 'ownerh'],
    ownerOnly: true,

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) return;

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**Owner Commands**')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '> **adminlock**, **commandlock**, **commandunlock**, **dm**, **errorlog**, **eval**, **guildinvite**, **guildleave**, **listservers**, **noprefix**, **reboot**'
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
            );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
