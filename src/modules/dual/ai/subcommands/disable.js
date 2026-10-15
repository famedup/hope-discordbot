/**
 * @file disable.js
 * @developer cashholy (carti)
 */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');
const { disableAiChannel, isAiChannel } = require('../../../../database/aiChannel');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const guild = interactionOrMessage.guild;
            const channel = interactionOrMessage.channel;
            const member = interactionOrMessage.member;

            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Permission Denied')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('You need **Manage Channels** permission.')
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            if (!await isAiChannel(guild.id, channel.id)) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Not Enabled')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('AI is not enabled in this channel.')
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            
            await disableAiChannel(guild.id, channel.id);

            
            try {
                const { GuildConfig } = require('../../../../database/schemas');
                const guildConfig = await GuildConfig.findOne({ where: { guildId: guild.id } });
                if (guildConfig && Array.isArray(guildConfig.aiChannelIds)) {
                    guildConfig.aiChannelIds = guildConfig.aiChannelIds.filter(id => id !== channel.id);
                    await guildConfig.save();
                }
            } catch (err) {
                console.error('[AI_DISABLE] Error syncing with GuildConfig:', err.message);
            }

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### AI Channel Disabled')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('I will no longer respond to messages here.')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error disabling AI channel:', error);
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Error')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Failed to disable AI channel.')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    }
};
