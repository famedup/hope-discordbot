// »» engineered by cashholy (carti) ««

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('AI commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ask')
                .setDescription('Chat with AI')
                .addStringOption(option =>
                    option.setName('prompt')
                        .setDescription('Your message to the AI')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('analyse')
                .setDescription('Analyze an image using AI vision')
                .addAttachmentOption(option =>
                    option.setName('image')
                        .setDescription('The image to analyze')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('prompt')
                        .setDescription('What do you want to know about the image?')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable AI responses in current channel')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable AI responses in current channel')
        ),

    name: 'ai',
    aliases: ['ai ask', 'ai analyse', 'ai analyze', 'ai enable', 'ai disable', 'luna ask', 'luna analyse', 'luna analyze', 'luna enable', 'luna disable'],
    description: 'AI commands',

    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();

        
        const subcommands = {
            'ask': require('./subcommands/ask.js'),
            'analyse': require('./subcommands/analyse.js'),
            'analyze': require('./subcommands/analyse.js'),
            'enable': require('./subcommands/enable.js'),
            'disable': require('./subcommands/disable.js')
        };

        let subcommandName;

        if (isSlashCommand) {
            subcommandName = interactionOrMessage.options.getSubcommand();
        } else {
            const messageText = interactionOrMessage.content.toLowerCase();

            if (messageText.includes('enable')) {
                subcommandName = 'enable';
            } else if (messageText.includes('disable')) {
                subcommandName = 'disable';
            } else if (messageText.includes('analyse') || messageText.includes('analyze')) {
                subcommandName = 'analyse';
            } else if (messageText.includes('ask')) {
                subcommandName = 'ask';
                if (args.length > 0 && args[0].toLowerCase() === 'ask') {
                    args = args.slice(1);
                }
            } else if (args.length === 0) {
                return require('../../../services/helpMenu').sendHelp('ai', interactionOrMessage);
            } else {
                subcommandName = 'ask';
            }
        }

        const subcommand = subcommands[subcommandName];

        if (!subcommand) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Unknown subcommand: ${subcommandName}\n\nUse \`ai ask\`, \`ai analyse\`, \`ai enable\`, or \`ai disable\``)
                );

            const replyOptions = {
                components: [container],
                flags: MessageFlags.IsComponentsV2
            };

            return interactionOrMessage.reply(replyOptions);
        }

        await subcommand.execute(interactionOrMessage, args);
    }
};
