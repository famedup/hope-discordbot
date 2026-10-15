//
//  Made with care by cashholy (carti)
//

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../../settings');

module.exports = {
    name: 'guildleave',
    description: 'Make the bot leave a server',
    aliases: ['leave', 'leaveserver', 'leaveguild'],
    ownerOnly: true,

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) return;

        const guildId = args[0];

        if (!guildId) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Guild Leave**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> Usage: \`${config.PREFIX} guildleave <guild_id>\``
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const guild = message.client.guilds.cache.get(guildId);

        if (!guild) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Guild Leave**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> Guild \`${guildId}\` not found.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const guildName = guild.name;
        const memberCount = guild.memberCount;

        try {
            await guild.leave();

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Guild Leave**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> Left **${guildName}**\n` +
                        `> - ID: \`${guildId}\`\n` +
                        `> - Members: ${memberCount.toLocaleString()}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (err) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Guild Leave**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> Failed to leave **${guildName}**: ${err.message}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
