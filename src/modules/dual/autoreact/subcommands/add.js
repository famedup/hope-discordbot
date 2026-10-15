/* ---
   author : cashholy (carti)
   module : add
   --- */

const { AutoReact } = require('../../../../database/schemas');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
    name: 'add',
    async execute(interactionOrMessage, args) {
        const isSlash = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        const word = isSlash ? interactionOrMessage.options.getString('word') : args[0];
        const emoji = isSlash ? interactionOrMessage.options.getString('emoji') : args[1];

        if (!word || !emoji) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### AutoReact · Add'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Usage: `autoreact add <word> <emoji>`'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        await AutoReact.upsert({
            guildId: interactionOrMessage.guildId,
            trigger: word.toLowerCase(),
            emoji: emoji
        });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### AutoReact · Added'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Trigger: \`${word}\` → ${emoji}`));

        return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
};
