/* ---
   author : cashholy (carti)
   module : boost
   --- */

// hope — boost message: thank people who boost the server.
// Same panel as welcome and farewell (see services/greeter.js).

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boost')
        .setDescription('Manage the server boost message')
        .addSubcommand(s => s.setName('setup').setDescription('Open the boost message panel'))
        .addSubcommand(s => s.setName('config').setDescription('View the boost message settings'))
        .addSubcommand(s => s.setName('test').setDescription('Preview the boost message using your profile'))
        .addSubcommand(s => s.setName('reset').setDescription('Reset the boost message')),

    name: 'boost',
    aliases: ['boosts', 'boostmsg'],
    description: 'Manage the server boost message',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        const subcommand = isSlash ? interactionOrMessage.options.getSubcommand() : args[0]?.toLowerCase();

        const greeter = require('../../../services/greeter');
        if (subcommand === 'test') return greeter.sendTest(interactionOrMessage, 'boost');
        if (subcommand === 'reset') return greeter.openReset(interactionOrMessage, 'boost');
        return greeter.openPanel(interactionOrMessage, 'boost');
    },
};
