// dev: cashholy (carti) | module: invites

const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: 'invites',
    aliases: ['inv', 'i'],
    description: 'Display invite statistics for today and all time',
    
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Display invite statistics for today and all time')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check (default: yourself)')
                .setRequired(false)
        ),

    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const client = interactionOrMessage.client;
            const guild = interactionOrMessage.guild;
            let targetUser = interactionOrMessage.user || interactionOrMessage.author;

            
            if (isSlashCommand) {
                const userOption = interactionOrMessage.options.getUser('user');
                if (userOption) {
                    targetUser = userOption;
                }
            } else if (args.length > 0) {
                const userArg = args[0];
                const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
                const userId = mentionMatch ? mentionMatch[1] : userArg;

                try {
                    targetUser = await client.users.fetch(userId);
                } catch (error) {
                    try {
                        const member = await guild.members.fetch(userId);
                        targetUser = member.user;
                    } catch (memberError) {
                        const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('# User Not Found\nCould not find the specified user')
                            )
                            .addSeparatorComponents(
                                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                            )
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('Please check the user ID or mention and try again.')
                            );

                        return interactionOrMessage.reply({
                            components: [errorContainer],
                            flags: MessageFlags.IsComponentsV2,
                            ephemeral: true
                        });
                    }
                }
            }

            const statsDb = require('../../../database/userStats');
            const guildId = guild.id;
            const userId = targetUser.id;

            const { getOne } = require('../../../database/pg');
            const allTimeInvites = await getOne(
                'SELECT COALESCE(SUM(uses), 0) as total FROM user_invites WHERE "userId" = $1 AND "guildId" = $2',
                [userId, guildId]
            );
            const allTimeCount = parseInt(allTimeInvites?.total || 0);

            
            const todayCount = 0;

            const displayName = targetUser.displayName;
            const username = targetUser.username;
            const isOwnStats = targetUser.id === (interactionOrMessage.user?.id || interactionOrMessage.author?.id);

            const statsContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${displayName} Invites`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`**All time** • **${allTimeCount.toLocaleString()}** invites in this server !\n**Today** • **${todayCount.toLocaleString()}** invites in this server`)
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# All-time invites are being updated in real time')
                );

            return interactionOrMessage.reply({
                components: [statsContainer],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Invites command error:', error);
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Error\nFailed to load invite statistics')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Please try again later or contact support.')
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    }
};
