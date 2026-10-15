// [dev] cashholy (carti) :: modules/dual/todo/subcommands/list.js

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const Todo = require('../../../../database/schemas/Todo');
const { createPaginationSession } = require('../../../../services/pagination');

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
                const emptyContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Your Todo List')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Your todo list is empty!')
                    );

                return interactionOrMessage.reply({
                    components: [emptyContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const itemsPerPage = 6;
            const totalPages = Math.ceil(totalTodos / itemsPerPage);

            
            const fetchPage = async (pageIndex) => {
                const offset = pageIndex * itemsPerPage;
                const todos = await Todo.findAll({
                    where: {
                        userId,
                        guildId,
                        completed: false
                    },
                    order: [['id', 'ASC']],
                    limit: itemsPerPage,
                    offset
                });
                return todos;
            };

            
            const renderPage = async (pageIndex, todos, state) => {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('# Your Todo List')
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    );

                if (todos && todos.length > 0) {
                    let todoText = '';
                    todos.forEach((todo) => {
                        todoText += `- ${todo.task} [${todo.id}]\n`;
                    });
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(todoText.trim())
                    );
                }

                return container;
            };

            // Create pagination session
            const paginationSession = createPaginationSession({
                interactionOrMessage,
                pages: fetchPage,
                renderPage,
                userId,
                totalPages,
                initialPage: 0,
                timeout: 300000,
                ephemeral: false
            });

            // Render and send initial page
            await paginationSession.renderInitial();

        } catch (error) {
            console.error('Todo list error:', error);
            
            const errorContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# Command Error')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        'An unexpected error occurred while processing your todo list. Please try again later.'
                    )
                );

            await interactionOrMessage.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
