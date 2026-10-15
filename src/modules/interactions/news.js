/**
 * ┌ cashholy (carti)
 * └ modules/interactions/news.js
 */

const { SlashCommandBuilder } = require('discord.js');
const { openNews } = require('../../services/newsBrowser');
const { NEWS_TOPICS, searchNews } = require('../../services/newsFeeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription('Browse the latest news')
        .addStringOption(option =>
            option.setName('query').setDescription('Search for a topic (optional)').setRequired(false)
        ),

    name: 'news',
    category: 'info',

    async execute(interaction) {
        const query = interaction.options.getString('query')?.trim();
        if (!query) return openNews(interaction, { title: 'News', topics: NEWS_TOPICS });
        return openNews(interaction, {
            title: 'News', note: query.slice(0, 40),
            topics: [['search', 'Search', () => searchNews(query)]],
        });
    },
};
