// [dev] cashholy (carti) :: modules/dual/welcome/welcome.js

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Manage server welcome message settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup welcome message for new members')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all welcome settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('View current welcome configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Preview the welcome message using your profile')
        ),

    name: 'welcome',
    aliases: ['welcomer', 'greet'],
    description: 'Manage server welcome message settings',

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
        if (!subcommand || subcommand === 'setup' || subcommand === 'config') return greeter.openPanel(interactionOrMessage, 'welcome');
        if (subcommand === 'test') return greeter.sendTest(interactionOrMessage, 'welcome');
        if (subcommand === 'reset') return greeter.openReset(interactionOrMessage, 'welcome');
        return greeter.openPanel(interactionOrMessage, 'welcome');
    }
};
