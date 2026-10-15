/**
 * @file config.js
 * @developer cashholy (carti)
 */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');
const { getConfig, getVanityUsers } = require('../../../../database/vanityRoles');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const guild = interactionOrMessage.guild;
            const config = await getConfig(guild.id);

            if (!config) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("# No Configuration\nVanity roles are not setup for this server")
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("Run `/vanityroles setup` to get started")
                    );
                
                return interactionOrMessage.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    ephemeral: true
                });
            }

            const role = guild.roles.cache.get(config.roleId);
            const roleName = role ? `<@&${config.roleId}>` : `(Deleted Role)`;
            const userCountRow = await getVanityUsers(guild.id);
            const userCount = userCountRow ? userCountRow.total : 0;

            const createdDate = new Date(config.createdAt * 1000);
            const formattedDate = `<t:${Math.floor(config.createdAt)}:d>`;

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Vanity Roles Configuration")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Role:** ${roleName}\n` +
                        `**Vanity Code:** ${config.vanityCode}\n` +
                        `**Users with Role:** ${userCount}\n` +
                        `**Setup Date:** ${formattedDate}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "**How it works**\n" +
                        "- Detects: discord.gg/code, .gg/code, /code in user status\n" +
                        "- Automatically grants role when detected\n" +
                        "- Removes role when status is cleared"
                    )
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });

        } catch (error) {
            console.error('Config command error:', error);
            const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# Error\nFailed to retrieve configuration")
                );
            
            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    }
};
