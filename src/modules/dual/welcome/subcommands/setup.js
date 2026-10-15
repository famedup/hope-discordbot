/**
 * ┌ cashholy (carti)
 * └ modules/dual/welcome/subcommands/setup.js
 */

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
const { WelcomeConfig } = require('../../../../database/schemas');

module.exports = {
    name: 'setup',
    description: 'Setup welcome message',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;

        const existing = await WelcomeConfig.findOne({ where: { guildId: guild.id } });
        if (existing?.channelId) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Already Configured'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Use `welcome config` to modify or `welcome reset` to start over.'));
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
                .setCustomId(`welcome_setup_simple_${userId}`)
                .setLabel('Simple')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`welcome_setup_container_${userId}`)
                .setLabel('Container')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`welcome_cancel_${userId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
        );

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Welcome Setup')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Choose the type of welcome message you want to create:\n\n**Simple**\nSend a plain text welcome message. You can use placeholders to personalize it.\n\n**Container**\nSend a welcome message in a container format. You can customize the embed with a title, description, image, etc.')
            )
            .addActionRowComponents(buttonRow);

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
