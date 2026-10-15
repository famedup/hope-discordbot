// dev: cashholy (carti) | module: autoreact

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoreact')
        .setDescription('Manage automatic emoji reactions for specific words')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add an automatic reaction for a word')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to trigger the reaction')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('The emoji to react with')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an automatic reaction')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('The word to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all auto reactions for this server')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all auto reactions for this server')
        ),

    name: 'autoreact',
    aliases: ['ar'],
    category: 'moderation',

    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();
        const subcommandsPath = path.join(__dirname, 'subcommands');
        const subcommandFiles = fs.readdirSync(subcommandsPath).filter(file => file.endsWith('.js'));

        let subcommandName;
        if (isSlashCommand) {
            subcommandName = interactionOrMessage.options.getSubcommand();
        } else {
            subcommandName = args[0];
            if (!subcommandName) {
                return require('../../../services/helpMenu').sendHelp('autoreact', interactionOrMessage);
            }
        }

        const subcommandFile = subcommandFiles.find(file => file === `${subcommandName}.js`);
        if (!subcommandFile) {
            const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### AutoReact · Error'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Unknown subcommand: \`${subcommandName}\``));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        const subcommand = require(path.join(subcommandsPath, subcommandFile));
        await subcommand.execute(interactionOrMessage, args.slice(1));
    }
};
