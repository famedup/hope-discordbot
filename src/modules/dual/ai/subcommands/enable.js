/*! © 2026 cashholy (carti) !*/

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');
const { enableAiChannel, isAiChannel } = require('../../../../database/aiChannel');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const guild = interactionOrMessage.guild;
            const channel = interactionOrMessage.channel;
            const member = interactionOrMessage.member;
            const user = isSlashCommand ? interactionOrMessage.user : interactionOrMessage.author;

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

            if (await isAiChannel(guild.id, channel.id)) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Already Enabled')
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('AI is already enabled in this channel.')
                    );

                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            await enableAiChannel(guild.id, channel.id, user.id);

            
            try {
                const { GuildConfig } = require('../../../../database/schemas');
                const [guildConfig] = await GuildConfig.findOrCreate({
                    where: { guildId: guild.id },
                    defaults: { guildId: guild.id }
                });
                if (!Array.isArray(guildConfig.aiChannelIds)) {
                    guildConfig.aiChannelIds = [];
                }
                if (!guildConfig.aiChannelIds.includes(channel.id)) {
                    guildConfig.aiChannelIds.push(channel.id);
                    await guildConfig.save();
                }
            } catch (err) {
                console.error('[AI_ENABLE] Error syncing with GuildConfig:', err.message);
            }

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### AI Channel Enabled')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('I will now respond to every message here.')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error enabling AI channel:', error);
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Error')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Failed to enable AI channel.')
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    }
};
