// »» engineered by cashholy (carti) ««

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { LoggingConfig } = require('../../../../database/schemas');

const LOG_CATEGORIES = [
    { value: 'messageLogs', label: 'Message Logs', description: 'Delete, edit & bulk delete' },
    { value: 'memberLogs', label: 'Member Logs', description: 'Join, leave & profile updates' },
    { value: 'moderationLogs', label: 'Moderation Logs', description: 'Ban, unban, kick & timeout' },
    { value: 'serverLogs', label: 'Server Logs', description: 'Channels, roles & server settings' },
    { value: 'voiceLogs', label: 'Voice Logs', description: 'Join, leave, switch & mute' }
];

function buildCategorySelect(placeholder = 'Select a log type to configure') {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('logging_category_select')
        .setPlaceholder(placeholder)
        .setMinValues(1)
        .setMaxValues(1);
    for (const cat of LOG_CATEGORIES) {
        menu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setValue(cat.value)
                .setLabel(cat.label)
                .setDescription(cat.description)
        );
    }
    return menu;
}

module.exports = {
    name: 'setup',
    description: 'Setup logging channels',
    LOG_CATEGORIES,
    buildCategorySelect,

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;

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

        const existing = await LoggingConfig.findOne({ where: { guildId: interactionOrMessage.guild.id } });
        if (existing) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Already Configured')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Logging is already set up for this server.\nUse **logging config** to view or **logging reset** to start over.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '**Logging Setup**\n' +
                    'Pick a log category below to assign a channel.'
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(buildCategorySelect())
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('logging_setup_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                )
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
