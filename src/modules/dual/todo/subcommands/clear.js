/**
 * ┌ cashholy (carti)
 * └ modules/dual/todo/subcommands/clear.js
 */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const Todo = require('../../../../database/schemas/Todo');
const emojis = require('../../../../media/emojis.json');

module.exports = {
    async execute(interactionOrMessage) {
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author.id;
        const guildId = interactionOrMessage.guild.id;

        try {
            const totalTodos = await Todo.count({
                where: {
                    userId,
                    guildId,
                    completed: false
                }
            });

            if (totalTodos === 0) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# No Todos Found')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            'Your todo list is already empty! There are no todos to clear.'
                        )
                    );

                return interactionOrMessage.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const deletedCount = await Todo.destroy({
                where: {
                    userId,
                    guildId,
                    completed: false
                }
            });

            if (deletedCount > 0) {
                const todoWord = deletedCount === 1 ? 'todo' : 'todos';
                const successContainer = new ContainerBuilder().setAccentColor(0x57F287)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `${emojis.check} Successfully cleared **${deletedCount}** ${todoWord} from your list.`
                        )
                    );

                await interactionOrMessage.reply({
                    components: [successContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            } else {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Clear Failed')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            'Failed to clear todos. Your list may already be empty.'
                        )
                    );

                await interactionOrMessage.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        } catch (error) {
            console.error('Todo clear error:', error);
            
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Database Error')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Failed to clear your todo list. Please try again later.'
                    )
                );

            await interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
