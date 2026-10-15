//
//  Made with care by cashholy (carti)
//

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');
const autobumpDb = require('../../../../database/autobump');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;

        const existingConfig = await autobumpDb.getConfig(guild.id);
        if (existingConfig) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Already Configured'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Use `autobump config` to modify or `autobump disable` to reset.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        
        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0xED4245)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} You need **Manage Server** permission!`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        
        if (isSlash) {
            const modal = new ModalBuilder()
                .setCustomId('autobump_setup_modal')
                .setTitle('Autobump Setup');

            const messageInput = new TextInputBuilder()
                .setCustomId('autobump_message')
                .setLabel('Bump Message')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter your bump message here...')
                .setRequired(true)
                .setMaxLength(2000);

            const intervalInput = new TextInputBuilder()
                .setCustomId('autobump_interval')
                .setLabel('Interval (e.g., 30m, 1h, 2h)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('1h')
                .setRequired(true)
                .setMaxLength(10);

            const channelInput = new TextInputBuilder()
                .setCustomId('autobump_channel')
                .setLabel('Channel ID (leave empty for current)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Optional - defaults to current channel')
                .setRequired(false)
                .setMaxLength(20);

            modal.addComponents(
                new ActionRowBuilder().addComponents(messageInput),
                new ActionRowBuilder().addComponents(intervalInput),
                new ActionRowBuilder().addComponents(channelInput)
            );

            await interactionOrMessage.showModal(modal);

            
            try {
                const modalInteraction = await interactionOrMessage.awaitModalSubmit({
                    filter: i => i.customId === 'autobump_setup_modal' && i.user.id === interactionOrMessage.user.id,
                    time: 300000
                });

                const message = modalInteraction.fields.getTextInputValue('autobump_message');
                const intervalStr = modalInteraction.fields.getTextInputValue('autobump_interval');
                const channelIdInput = modalInteraction.fields.getTextInputValue('autobump_channel');
                const intervalMs = parseInterval(intervalStr);

                if (!intervalMs || intervalMs < 10000) { 
                    const errorContainer = new ContainerBuilder().setAccentColor(0xED4245)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${emojis.error} Invalid interval! Minimum is 10 seconds (10s).`)
                        );
                    return modalInteraction.reply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                const channelId = channelIdInput || interactionOrMessage.channel.id;
                const channel = guild.channels.cache.get(channelId);

                if (!channel || !channel.isTextBased()) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0xED4245)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${emojis.error} Invalid channel!`)
                        );
                    return modalInteraction.reply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
                }

                
                await autobumpDb.setConfig({
                    guildId: guild.id,
                    channelId: channelId,
                    message: message,
                    intervalMs: intervalMs,
                    enabled: 0,
                    deleteAfterMs: 60000,
                    lastBumpAt: 0
                });

                const successContainer = new ContainerBuilder().setAccentColor(0x57F287)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${emojis.success} Autobump Setup Complete`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**Channel:** <#${channelId}>\n` +
                            `**Interval:** ${intervalStr}\n` +
                            `**Status:** Disabled\n\n` +
                            `-# Use \`autobump enable\` to start`
                        )
                    );

                return modalInteraction.reply({
                    components: [successContainer],
                    flags: MessageFlags.IsComponentsV2
                });

            } catch (error) {
                if (error.code === 'InteractionCollectorError') {
                    return; 
                }
                console.error('Autobump setup error:', error);
            }
        } else {
            
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### Autobump Setup`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Use the slash command `/autobump setup` for a modal-based setup.\n\n' +
                        'Or use: `autobump setup <interval> <message>`\n' +
                        'Example: `autobump setup 1h Check out our server!`'
                    )
                );

            if (args.length >= 2) {
                const intervalStr = args[0];
                const message = args.slice(1).join(' ');
                const intervalMs = parseInterval(intervalStr);

                if (!intervalMs || intervalMs < 10000) {
                    const errorContainer = new ContainerBuilder().setAccentColor(0xED4245)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${emojis.error} Invalid interval! Minimum is 10 seconds (10s).`)
                        );
                    return interactionOrMessage.reply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                await autobumpDb.setConfig({
                    guildId: guild.id,
                    channelId: interactionOrMessage.channel.id,
                    message: message,
                    intervalMs: intervalMs,
                    enabled: 0,
                    deleteAfterMs: 60000,
                    lastBumpAt: 0
                });

                const successContainer = new ContainerBuilder().setAccentColor(0x57F287)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${emojis.success} Autobump Setup Complete`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**Channel:** <#${interactionOrMessage.channel.id}>\n` +
                            `**Interval:** ${intervalStr}\n` +
                            `**Status:** Disabled\n\n` +
                            `-# Use \`autobump enable\` to start`
                        )
                    );

                return interactionOrMessage.reply({
                    components: [successContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};

function parseInterval(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}
