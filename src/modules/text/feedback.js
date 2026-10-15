// »» engineered by cashholy (carti) ««

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const cfg = require('../../settings');
const feedbackDb = require('../../database/feedback');

function errContainer(text) {
    return new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
    name: 'feedback',
    description: 'Feedback system commands',
    aliases: ['fb', 'review'],
    async execute(message, args) {
        const prefix = cfg.PREFIX;

        if (!args.length) {
            return require('../../services/helpMenu').sendHelp('feedback', message);
        }

        const subcommand = args[0].toLowerCase();

        if (subcommand === 'setup') {
            if (!message.member.permissions.has('Administrator')) {
                return message.reply({
                    components: [errContainer('You need Administrator permission to use this command!')],
                    flags: MessageFlags.IsComponentsV2
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

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (subcommand === 'panel') {
            if (!message.member.permissions.has('Administrator')) {
                return message.reply({
                    components: [errContainer('You need Administrator permission to use this command!')],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            try {
                const config = await feedbackDb.getConfig(message.guildId);

                if (!config) {
                    return message.reply({
                        components: [errContainer(`Feedback system is not configured! Use \`${prefix}feedback setup\` first.`)],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                const reviewChannel = message.guild.channels.cache.get(config.review_channel_id);

                if (!reviewChannel) {
                    return message.reply({
                        components: [errContainer('Review channel not found!')],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                const panelContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`# ${message.guild.name} - Service Reviews`)
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

                panelContainer.addActionRowComponents(new ActionRowBuilder().addComponents(button));

                await reviewChannel.send({
                    components: [panelContainer],
                    flags: MessageFlags.IsComponentsV2
                });

                const doneContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`Feedback panel sent to ${reviewChannel}!`)
                    );

                return message.reply({
                    components: [doneContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error('Panel error:', error);
                return message.reply({
                    components: [errContainer('An error occurred while sending the feedback panel!')],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        if (subcommand === 'config') {
            try {
                const fbConfig = await feedbackDb.getConfig(message.guildId);

                if (!fbConfig) {
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('# Feedback Configuration')
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`Feedback system is not configured for this guild.\n\nUse \`${prefix}feedback setup\` to configure it.`)
                        );

                    return message.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                const reviewChannel = message.guild.channels.cache.get(fbConfig.review_channel_id);
                const logChannel = fbConfig.log_channel_id ? message.guild.channels.cache.get(fbConfig.log_channel_id) : null;

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Feedback Configuration')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Review Channel:** ${reviewChannel ? reviewChannel.toString() : 'Not found'}\n**Log Channel:** ${logChannel ? logChannel.toString() : 'Not configured'}`)
                    );

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error('Config error:', error);
                return message.reply({
                    components: [errContainer('An error occurred while retrieving configuration!')],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        if (subcommand === 'reset') {
            if (!message.member.permissions.has('Administrator')) {
                return message.reply({
                    components: [errContainer('You need Administrator permission to use this command!')],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            try {
                await feedbackDb.deleteConfig(message.guildId);

                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Reset Complete')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Feedback configuration has been reset for this guild.')
                    );

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error('Reset error:', error);
                return message.reply({
                    components: [errContainer('An error occurred while resetting configuration!')],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }
    }
};
