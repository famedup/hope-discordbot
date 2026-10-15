/* ---
   author : cashholy (carti)
   module : autopost
   --- */

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autopost')
        .setDescription('Automatically post images to channels every minute')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a category to auto-post in a channel')
                .addStringOption(opt =>
                    opt.setName('category')
                        .setDescription('Category of images to post')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Female', value: 'female' },
                            { name: 'Male', value: 'male' },
                            { name: 'Anime', value: 'anime' },
                            { name: 'Random', value: 'random' }
                        )
                )
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Channel to post images in')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Stop auto-posting a category')
                .addStringOption(opt =>
                    opt.setName('category')
                        .setDescription('Category to remove')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Female', value: 'female' },
                            { name: 'Male', value: 'male' },
                            { name: 'Anime', value: 'anime' },
                            { name: 'Random', value: 'random' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('Remove all autopost channels for this server')
        ),

    name: 'autopost',
    aliases: ['ap'],
    description: 'Automatically post images to channels every minute',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (!subcommand || !['add', 'remove', 'reset'].includes(subcommand)) {
            const { sendHelp } = require('../../../services/helpMenu');
            return sendHelp('autopost', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
    }
};
