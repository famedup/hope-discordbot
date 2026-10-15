/* ---
   author : cashholy (carti)
   module : adminlock
   --- */

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../../settings');
const { toggleAdminLock } = require('../../../services/adminLock');

module.exports = {
    name: 'adminlock',
    description: 'Lock all commands for non-owners',
    aliases: ['alock'],
    ownerOnly: true,

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) return;

        const newState = toggleAdminLock();

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Admin Lock — ${newState ? 'Enabled' : 'Disabled'}**`)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    newState
                        ? '> All commands are locked for non-owners.'
                        : '> All commands are accessible to everyone.'
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
