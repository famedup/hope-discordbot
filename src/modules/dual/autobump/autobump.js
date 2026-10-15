/**
 * ┌ cashholy (carti)
 * └ modules/dual/autobump/autobump.js
 */

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autobump')
        .setDescription('Manage automatic bump messages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup autobump with message and interval')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable autobump')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable autobump')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('View current autobump configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all autobump settings')
        ),

    name: 'autobump',
    aliases: ['ab', 'bump'],
    description: 'Manage automatic bump messages',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (!subcommand || !['setup', 'enable', 'disable', 'config', 'reset'].includes(subcommand)) {
            const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
            const emojis = require('../../../media/emojis.json');

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### ${emojis.timer} Autobump Commands`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '`autobump setup` - Setup bump message & interval\n' +
                        '`autobump enable` - Enable autobump\n' +
                        '`autobump disable` - Disable autobump\n' +
                        '`autobump config` - View current settings\n' +
                        '`autobump reset` - Reset all settings'
                    )
                );

            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
