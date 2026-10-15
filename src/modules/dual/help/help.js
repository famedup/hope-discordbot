/* ---
   author : cashholy (carti)
   module : help
   --- */

const { SlashCommandBuilder } = require('discord.js');
const ui = require('../../../services/ui');
const i18n = require('../../../localization');
const { showHelp, showSimpleHelp, showCommand, resolveCategory } = require('../../../services/helpMenu');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Browse my commands')
        .setDescriptionLocalizations(i18n.descriptionLocalizations('slash.help'))
        .addStringOption(option =>
            option.setName('query')
                .setDescription('A category or command (e.g. antinuke, ban)')
                .setRequired(false)
        ),

    name: 'help',
    description: 'Browse my commands',
    aliases: ['h'],
    category: 'information',

    async execute(ctx, args = []) {
        const isSlash = ctx.isChatInputCommand?.();
        const query = (isSlash ? ctx.options.getString('query') : args.join(' '))?.trim();

        if (!query) return showSimpleHelp(ctx);

        // a real command wins over a category of the same name (help antinuke)
        if (await showCommand(ctx, query)) return;

        if (resolveCategory(query)) return showHelp(ctx, query);

        return ui.say.error(ctx, i18n.translator(ctx, 'help')('help.notFound', { query: query.slice(0, 40) }));
    }
};
