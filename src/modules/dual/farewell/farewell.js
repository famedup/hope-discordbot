// ▛▀ cashholy (carti) ▀▜

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('farewell')
        .setDescription('Manage server farewell message settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup farewell message for leaving members')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all farewell settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('View current farewell configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Preview the farewell message using your profile')
        ),

    name: 'farewell',
    aliases: ['goodbye', 'leave'],
    description: 'Manage server farewell message settings',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        const greeter = require('../../../services/greeter');
        // setup / config (and no subcommand at all) open the panel
        if (!subcommand || subcommand === 'setup' || subcommand === 'config') return greeter.openPanel(interactionOrMessage, 'farewell');
        if (subcommand === 'test') return greeter.sendTest(interactionOrMessage, 'farewell');
        if (subcommand === 'reset') return greeter.openReset(interactionOrMessage, 'farewell');
        return greeter.openPanel(interactionOrMessage, 'farewell');
    }
};
