//
//  Made with care by cashholy (carti)
//

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('../../../../services/pagination');
const statsDb = require('../../../../database/userStats');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        try {
            const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
            const client = interactionOrMessage.client;
            const guild = interactionOrMessage.guild;
            const guildId = guild.id;
            const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;

            const itemsPerPage = 7;

            const totalQuery = await statsDb.getTotalMessageUsers(guildId);
            const totalUsers = totalQuery?.total || 0;

            if (totalUsers === 0) {
                const noDataContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# All-Time Message Leaderboard\n*No message data available*')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Start chatting to build the leaderboard!')
                    );

                return interactionOrMessage.reply({
                    components: [noDataContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const totalPages = Math.ceil(totalUsers / itemsPerPage);

            const getPage = async (pageIndex) => {
                const query = await statsDb.getMessageLeaderboard(guildId, itemsPerPage, pageIndex * itemsPerPage);
                return query;
            };

            const renderPage = async (pageIndex, pageData) => {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Messages Leaderboard')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    );

                let leaderboardText = '';

                if (pageData && pageData.length > 0) {
                    const users = await Promise.all(
                        pageData.map(data => client.users.fetch(data.userId).catch(() => null))
                    );

                    for (let i = 0; i < pageData.length; i++) {
                        const data = pageData[i];
                        const rank = pageIndex * itemsPerPage + i + 1;
                        const user = users[i];
                        const displayName = user ? user.displayName : 'Unknown User';
                        const profileUrl = `https://discord.com/users/${data.userId}`;
                        const count = data.count;

                        leaderboardText += `**${rank}.** [${displayName}](${profileUrl}) - **${count.toLocaleString()}** messages\n`;
                    }
                } else {
                    leaderboardText = 'No data available for this page.';
                }

                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(leaderboardText.trim())
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
                );

                return container;
            };

            await createPaginationSession({
                interactionOrMessage,
                pages: getPage,
                renderPage,
                userId,
                totalPages
            }).renderInitial();

        } catch (error) {
            console.error('Messages leaderboard error:', error);
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Error\nFailed to load message leaderboard')
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
