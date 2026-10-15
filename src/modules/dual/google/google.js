/**
 * ┌ cashholy (carti)
 * └ modules/dual/google/google.js
 */

const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { createPaginationSession } = require('../../../services/pagination');
const config = require('../../../settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('google')
        .setDescription('Search Google for web results')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Search query')
                .setRequired(true)
        ),

    name: 'google',
    aliases: ['search'],
    category: 'social',
    cooldown: 5,

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isChatInputCommand?.();
        const query = isSlash
            ? interactionOrMessage.options.getString('query')
            : args.join(' ');
        const userId = isSlash ? interactionOrMessage.user.id : interactionOrMessage.author.id;

        if (!config.SERPAPI.API_KEY) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Google Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('SerpApi key is not configured.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (!query) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Google Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Usage: `google <search query>`'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const blacklistedWords = [
            'porn', 'pussy', 'naked', 'vagina', 'dick', 'sex', 'xxx', 'nude', 'nsfw',
            'boobs', 'tits', 'penis', 'cock', 'fuck', 'shit', 'bitch', 'ass', 'anal',
            'orgasm', 'masturbate', 'horny', 'lesbian', 'gay porn', 'milf', 'teen sex',
            'adult', 'erotic', 'fetish', 'hardcore', 'blowjob', 'cumshot', 'threesome'
        ];

        if (blacklistedWords.some(word => query.toLowerCase().includes(word.toLowerCase()))) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Google Search'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Search query contains inappropriate content.'));
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        let loadingMsg = null;

        if (isSlash) {
            await interactionOrMessage.deferReply();
        } else {
            const loadingContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Google · ${query}`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('Fetching results...'));
            loadingMsg = await interactionOrMessage.reply({ components: [loadingContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const paginationTarget = isSlash ? interactionOrMessage : loadingMsg;

        try {
            const { getJson } = require('serpapi');
            const searchResults = await getJson({ engine: 'google', q: query, api_key: config.SERPAPI.API_KEY });
            const results = (searchResults.organic_results || []).slice(0, 25);

            if (results.length === 0) {
                const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Google · ${query}`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('No results found. Try different keywords.'));
                if (isSlash) return interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                return loadingMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            const itemsPerPage = 5;
            const totalPages = Math.ceil(results.length / itemsPerPage);

            const fetchPage = async (pageIndex) => results.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);

            const renderPage = async (pageIndex, pageResults) => {
                const startIndex = pageIndex * itemsPerPage;
                const resultsText = pageResults.map((result, index) => {
                    const num = startIndex + index + 1;
                    const snippet = result.snippet ? `\n-# ${result.snippet.substring(0, 120)}` : '';
                    return `**${num}.** [${result.title || 'No title'}](${result.link || '#'})${snippet}`;
                }).join('\n');

                return new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `### Google · ${query}\n-# Page ${pageIndex + 1}/${totalPages}`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(resultsText));
            };

            await createPaginationSession({
                interactionOrMessage: paginationTarget,
                pages: fetchPage,
                renderPage,
                userId,
                totalPages,
                initialPage: 0,
                timeout: 300000,
                useEdit: !isSlash
            }).renderInitial();

        } catch (error) {
            console.error('Google search error:', error);
            let msg = 'Failed to fetch results. Please try again later.';
            if (error.message?.includes('API key')) msg = 'Invalid SerpAPI key.';
            else if (error.message?.includes('rate limit') || error.message?.includes('quota')) msg = 'Rate limit exceeded. Try again later.';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Google · ${query}`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(msg));

            if (isSlash) return interactionOrMessage.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            return loadingMsg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};
