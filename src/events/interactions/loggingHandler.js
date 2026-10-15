// dev: cashholy (carti) | module: loggingHandler

const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ChannelType,
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');
const { LoggingConfig, GuildConfig } = require('../../database/schemas');
const { LOG_CATEGORIES, buildCategorySelect: buildCategorySelectFromSetup } = require('../../modules/dual/logging/subcommands/setup');

function buildCategorySelect(placeholder = 'Configure another log type') {
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

async function handle(interaction) {
    const id = interaction.customId;

    if (interaction.isButton()) {
        if (id === 'logging_setup_cancel') {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Logging Setup**\nSetup cancelled. No changes were saved.')
                );
            return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (id === 'logging_setup_done') {
            const fmt = (channelId) => channelId ? `<#${channelId}>` : 'Not set';

            try {
                const config = await LoggingConfig.findOne({ where: { guildId: interaction.guild.id } });

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Logging Configuration')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            config
                                ? `> **Message Logs:** ${fmt(config.messageLogsChannelId)}\n` +
                                  `> **Member Logs:** ${fmt(config.memberLogsChannelId)}\n` +
                                  `> **Moderation Logs:** ${fmt(config.moderationLogsChannelId)}\n` +
                                  `> **Server Logs:** ${fmt(config.serverLogsChannelId)}\n` +
                                  `> **Voice Logs:** ${fmt(config.voiceLogsChannelId)}`
                                : 'No channels were configured.'
                        )
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('-# Use logging config to review • logging reset to clear')
                    );

                return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
            } catch (_) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Logging Configuration\nSetup complete.')
                    );
                return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }
        }

        if (id === 'logging_setup_back') {
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
                    new ActionRowBuilder().addComponents(buildCategorySelectFromSetup())
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('logging_setup_cancel')
                            .setLabel('Cancel')
                            .setStyle(ButtonStyle.Danger)
                    )
                );
            return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }

    if (interaction.isStringSelectMenu() && id === 'logging_category_select') {
        const selectedCategory = interaction.values[0];
        const category = LOG_CATEGORIES.find(c => c.value === selectedCategory);

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**${category?.label || selectedCategory}**\n` +
                    `${category?.description || ''}\n` +
                    `Select a channel to assign:`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(`logging_channel_${selectedCategory}`)
                        .setPlaceholder('Select a channel')
                        .setChannelTypes(ChannelType.GuildText)
                        .setMinValues(0)
                        .setMaxValues(1)
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('logging_setup_back')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('logging_setup_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                )
            );

        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (interaction.isChannelSelectMenu() && id.startsWith('logging_channel_')) {
        const logType = id.replace('logging_channel_', '');
        const category = LOG_CATEGORIES.find(c => c.value === logType);
        const selectedChannel = interaction.channels.first();
        const channelId = selectedChannel?.id || null;

        await LoggingConfig.upsert({ guildId: interaction.guild.id, [`${logType}ChannelId`]: channelId });
        await GuildConfig.upsert({ guildId: interaction.guild.id, loggingEnabled: true });

        const channelText = channelId ? `<#${channelId}>` : 'Disabled';

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**${category?.label || logType}** set to ${channelText}\n` +
                    `Configure another category or click Done.`
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
                        .setCustomId('logging_setup_done')
                        .setLabel('Done')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('logging_setup_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                )
            );

        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    return false;
}

module.exports = { handle };
