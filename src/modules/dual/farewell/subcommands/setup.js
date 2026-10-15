//
//  Made with care by cashholy (carti)
//

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { FarewellConfig } = require('../../../../database/schemas');

module.exports = {
    name: 'setup',
    description: 'Setup farewell message',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;

        const existing = await FarewellConfig.findOne({ where: { guildId: guild.id } });
        if (existing?.channelId) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Already Configured'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Use `farewell config` to modify or `farewell reset` to start over.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (!member.permissions.has('Administrator')) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('You need **Administrator** permission to use this command.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`farewell_setup_simple_${userId}`)
                .setLabel('Simple')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`farewell_setup_container_${userId}`)
                .setLabel('Container')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`farewell_cancel_${userId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
        );

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Farewell Setup')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Choose the type of farewell message you want to create:\n\n**Simple**\nSend a plain text farewell message. You can use placeholders to personalize it.\n\n**Container**\nSend a farewell message in a container format. You can customize the embed with a title, description, image, etc.')
            )
            .addActionRowComponents(buttonRow);

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
