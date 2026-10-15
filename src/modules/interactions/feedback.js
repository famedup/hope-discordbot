// »» engineered by cashholy (carti) ««

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const feedbackDb = require('../../database/feedback');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Feedback system commands')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Configure the feedback system')
        )
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('Send the feedback panel to the review channel')
        )
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('View current feedback configuration')
        )
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('Reset feedback configuration for this guild')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    content: 'You need Administrator permission to use this command!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Feedback System Setup\n**Step 1 of 2**')
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Select the **review channel** where feedback submissions will be posted:')
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('feedback_setup_review')
                            .setPlaceholder('Select review channel')
                            .setChannelTypes(ChannelType.GuildText)
                    )
                );

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (subcommand === 'panel') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    content: 'You need Administrator permission to use this command!',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                const config = await feedbackDb.getConfig(interaction.guildId);

                if (!config) {
                    return interaction.reply({
                        content: 'Feedback system is not configured! Use `/feedback setup` first.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const reviewChannel = interaction.guild.channels.cache.get(config.review_channel_id);

                if (!reviewChannel) {
                    return interaction.reply({
                        content: 'Review channel not found!',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# ${interaction.guild.name} - Service Reviews`)
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Share Your Experience!\n\nWe value your feedback about our services. Help us improve by sharing your experience!')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Click the button below to submit your feedback.')
                    );

                const button = new ButtonBuilder()
                    .setCustomId('open_feedback_modal')
                    .setLabel('Submit Your Review')
                    .setStyle(ButtonStyle.Primary);

                container.addActionRowComponents(new ActionRowBuilder().addComponents(button));

                await reviewChannel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });

                return interaction.reply({
                    content: `Feedback panel sent to ${reviewChannel}!`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.error('Panel error:', error);
                return interaction.reply({
                    content: 'An error occurred while sending the feedback panel!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (subcommand === 'config') {
            try {
                const config = await feedbackDb.getConfig(interaction.guildId);

                if (!config) {
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('# Feedback Configuration')
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('Feedback system is not configured for this guild.\n\nUse `/feedback setup` to configure it.')
                        );

                    return interaction.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                const reviewChannel = interaction.guild.channels.cache.get(config.review_channel_id);
                const logChannel = config.log_channel_id ? interaction.guild.channels.cache.get(config.log_channel_id) : null;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Feedback Configuration')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Review Channel:** ${reviewChannel ? reviewChannel.toString() : 'Not found'}\n**Log Channel:** ${logChannel ? logChannel.toString() : 'Not configured'}`)
                    );

                return interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error('Config error:', error);
                return interaction.reply({
                    content: 'An error occurred while retrieving configuration!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (subcommand === 'reset') {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    content: 'You need Administrator permission to use this command!',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                await feedbackDb.deleteConfig(interaction.guildId);

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Reset Complete')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Feedback configuration has been reset for this guild.')
                    );

                return interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error('Reset error:', error);
                return interaction.reply({
                    content: 'An error occurred while resetting configuration!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};
