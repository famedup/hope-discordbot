/* ---
   author : cashholy (carti)
   module : guildinvite
   --- */

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../../settings');

module.exports = {
    name: 'guildinvite',
    description: 'Generate an invite link for a server',
    aliases: ['getinvite', 'serverinvite', 'ginvite'],
    ownerOnly: true,

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) return;

        const guildId = args[0];

        if (!guildId) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Guild Invite**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> Usage: \`${config.PREFIX} guildinvite <guild_id>\``
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
                    new TextDisplayBuilder().setContent('**Guild Invite**')
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

        try {
            const channels = guild.channels.cache.filter(
                ch => ch.isTextBased() && ch.permissionsFor(guild.members.me)?.has('CreateInstantInvite')
            );

            if (channels.size === 0) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Guild Invite**')
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> No available channels to create invite in **${guild.name}**.`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                    );

                return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const channel = channels.first();
            const invite = await channel.createInvite({ maxAge: 86400, maxUses: 1, unique: true });

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Guild Invite**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> **${guild.name}**\n` +
                        `> - Invite: ${invite.url}\n` +
                        `> - Channel: #${channel.name}\n` +
                        `> - Members: ${guild.memberCount.toLocaleString()}\n` +
                        `> - Expires: 24h · Max uses: 1`
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
                    new TextDisplayBuilder().setContent('**Guild Invite**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`> Failed to create invite: ${err.message}`)
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
