// [dev] cashholy (carti) :: modules/dual/todo/todo.js

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('todo')
        .setDescription('Manage your todo list')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a task to your todo list')
                .addStringOption(option =>
                    option
                        .setName('task')
                        .setDescription('The task to add')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View your todo list')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a task from your todo list')
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('The task ID to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all tasks from your todo list')
        ),

    name: 'todo',
    aliases: ['task', 'tasks'],
    description: 'Manage your todo list',

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
                return require('../../../services/helpMenu').sendHelp('todo', interactionOrMessage);
            }
        }

        const subcommandFile = subcommandFiles.find(file => file === `${subcommandName}.js`);
        
        if (!subcommandFile) {
            const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Unknown subcommand: ${subcommandName}`)
                );
            
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        const subcommand = require(path.join(subcommandsPath, subcommandFile));
        await subcommand.execute(interactionOrMessage, args.slice(1));
    }
};
