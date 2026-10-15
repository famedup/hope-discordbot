/** @author cashholy (carti) */

const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../../../settings');
const { createPaginationSession } = require('../../../services/pagination');

const LOGS_PER_PAGE = 10;
const errorLogs = [];
const MAX_LOGS = 100;

function addErrorLog(error, context = '') {
    const timestamp = new Date().toISOString();
    errorLogs.unshift({
        timestamp,
        error: error.message || String(error),
        stack: error.stack?.split('\n').slice(0, 3).join('\n') || '',
        context
    });
    if (errorLogs.length > MAX_LOGS) errorLogs.pop();
}

process.on('uncaughtException', (error) => addErrorLog(error, 'Uncaught Exception'));
process.on('unhandledRejection', (error) => addErrorLog(error, 'Unhandled Rejection'));

module.exports = {
    name: 'errorlog',
    description: 'View recent error logs',
    aliases: ['errorlogs', 'errors', 'errs'],
    ownerOnly: true,
    addErrorLog,

    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) return;

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'clear') {
            errorLogs.length = 0;
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Error Logs**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('> All error logs cleared.')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (errorLogs.length === 0) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Error Logs**')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('> No errors logged.')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Admin restricted access | ${config.BOT_NAME}`)
                );

            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const totalPages = Math.ceil(errorLogs.length / LOGS_PER_PAGE);
        const pages = [];

        for (let i = 0; i < totalPages; i++) {
            const startIndex = i * LOGS_PER_PAGE;
            pages.push({ logs: errorLogs.slice(startIndex, startIndex + LOGS_PER_PAGE), startIndex });
        }

        const renderPage = (pageIndex, pageData, state) => {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Error Logs**')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                );

            let logsText = '';
            pageData.logs.forEach((log, index) => {
                const num = pageData.startIndex + index + 1;
                const time = new Date(log.timestamp).toLocaleString();
                logsText += `**${num}. ${log.context}** — \`${time}\`\n`;
                logsText += `\`\`\`\n${log.error}\n\`\`\`\n`;
            });

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(logsText.trim())
            );

            container
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Page ${pageIndex + 1}/${totalPages} · ${errorLogs.length} errors | ${config.BOT_NAME}`
                    )
                );

            return container;
        };

        const pagination = createPaginationSession({
            interactionOrMessage: message,
            pages,
            renderPage,
            userId: message.author.id,
            initialPage: 0,
            timeout: 300000
        });

        await pagination.renderInitial();
    }
};
