// »» engineered by cashholy (carti) ««

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
    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author.id;
        const guildId = interactionOrMessage.guild.id;

        let todoId;
        if (isSlashCommand) {
            todoId = interactionOrMessage.options.getInteger('id');
        } else {
            todoId = parseInt(args[0]);
        }

        if (!todoId || isNaN(todoId)) {
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Missing Todo ID')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Please provide a todo ID to remove.\n\n' +
                        '**Usage:** `todo remove <id>`\n' +
                        '**Example:** `todo remove 5`\n\n' +
                        'Use `todo list` to see your available todos and their IDs.'
                    )
                );

            return interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            const existingTodo = await Todo.findOne({
                where: {
                    id: todoId,
                    userId,
                    guildId
                }
            });

            if (!existingTodo) {
                const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Todo Not Found')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `Todo with ID **${todoId}** was not found in your todo list.\n\n` +
                            `Use \`todo list\` to see your available todos and their IDs.`
                        )
                    );

                return interactionOrMessage.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            await existingTodo.destroy();

            const successContainer = new ContainerBuilder().setAccentColor(0x57F287)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.check} Task successfully removed from your todo list.`)
                );

            await interactionOrMessage.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('Todo remove error:', error);
            
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Database Error')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'Failed to remove task from your todo list. Please try again later.'
                    )
                );

            await interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
