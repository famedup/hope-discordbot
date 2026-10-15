/* ⌁ crafted by cashholy (carti) ⌁ */

const { AutoReact } = require('../../../../database/schemas');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
    name: 'reset',
    async execute(interactionOrMessage) {
        await AutoReact.destroy({ where: { guildId: interactionOrMessage.guildId } });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### AutoReact · Reset'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Successfully reset all autoreacts for this server.'));
        return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
