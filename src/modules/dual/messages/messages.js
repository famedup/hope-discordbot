// ▛▀ cashholy (carti) ▀▜

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
    name: 'messages',
    aliases: ['m'],
    description: 'Display message statistics for today and all time',

    data: new SlashCommandBuilder()
        .setName('messages')
        .setDescription('Display message statistics for today and all time')
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
                                new TextDisplayBuilder().setContent('Please provide a valid user mention, ID, or username.')
                            );

                        return interactionOrMessage.reply({
                            components: [errorContainer],
                            flags: MessageFlags.IsComponentsV2,
                            ephemeral: true
                        });
                    }
                }
            }

            const userId = targetUser.id;
            const guildId = guild.id;
            const today = new Date().toISOString().split('T')[0];

            
            const statsDb = require('../../../database/userStats');

            
            const allTimeStats = await statsDb.getUserMessageCount(userId, guildId);
            const allTimeCount = allTimeStats?.count || 0;
            const todayCount = 0; 

            const displayName = targetUser.displayName;
            const username = targetUser.username;
            const isOwnStats = targetUser.id === (interactionOrMessage.user?.id || interactionOrMessage.author?.id);

            const statsContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${displayName} Messages`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`**All time** • **${allTimeCount.toLocaleString()}** messages in this server !\n**Today** • **${todayCount.toLocaleString()}** messages in this server`)
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                        )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('-# Messages are being updated in real time')
                );

            return interactionOrMessage.reply({
                components: [statsContainer],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Messages command error:', error);
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Error\nFailed to load message statistics')
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
