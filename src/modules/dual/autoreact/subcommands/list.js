/**
 * ┌ cashholy (carti)
 * └ modules/dual/autoreact/subcommands/list.js
 */

const { AutoReact } = require('../../../../database/schemas');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
    name: 'list',
    async execute(interactionOrMessage) {
        const reactions = await AutoReact.findAll({ where: { guildId: interactionOrMessage.guildId } });

        if (reactions.length === 0) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### AutoReact · List'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('No autoreacts configured for this server.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const list = reactions.map((r, i) => `**${i + 1}.** \`${r.trigger}\` → ${r.emoji}`).join('\n');

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### AutoReact · List'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));

        return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
