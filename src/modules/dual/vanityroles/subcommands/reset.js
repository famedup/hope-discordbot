// [dev] cashholy (carti) :: modules/dual/vanityroles/subcommands/reset.js

const emojis = require('../../../../media/emojis.json');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');
const { deleteConfig, deleteGuildData, getConfig } = require('../../../../database/vanityRoles');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const guild = interactionOrMessage.guild;
            const userId = isSlashCommand ? interactionOrMessage.user.id : interactionOrMessage.author.id;

            const config = await getConfig(guild.id);

            if (!config) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("# Nothing to Reset\nVanity roles are not setup for this server")
                    );
                
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            
            const confirmButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('reset_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('reset_confirm')
                    .setLabel('Delete All Data')
                    .setStyle(ButtonStyle.Danger)
            );

            const confirmContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Confirm Reset")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "This will delete:\n" +
                        "- Vanity role configuration\n" +
                        "- All tracking data\n\n" +
                        "This action cannot be undone!"
                    )
                )
                .addActionRowComponents(confirmButtons);

            const msg = await interactionOrMessage.reply({
                components: [confirmContainer],
                flags: MessageFlags.IsComponentsV2
            });

            
            const collector = msg.createMessageComponentCollector({
                filter: (interaction) => interaction.user.id === userId,
                time: 30000,
                max: 1
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'reset_confirm') {
                    
                    await deleteConfig(guild.id);
                    await deleteGuildData(guild.id);

                    const successContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`# Reset Complete ${emojis.success}\nAll vanity role data has been deleted`)
                        );

                    await interaction.update({
                        components: [successContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } else if (interaction.customId === 'reset_cancel') {
                    const cancelContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("Reset cancelled")
                        );

                    await interaction.update({
                        components: [cancelContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            });

            collector.on('end', () => {
                
            });

        } catch (error) {
            console.error('Reset command error:', error);
            const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Error\nFailed to reset vanity roles")
                );
            
            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    }
};
