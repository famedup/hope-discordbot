/*! © 2026 cashholy (carti) !*/

const { openNews } = require('../../services/newsBrowser');
const { NEWS_TOPICS, searchNews } = require('../../services/newsFeeds');

module.exports = {
    name: 'news',
    aliases: ['headlines', 'articles'],
    description: 'Browse the latest news',
    category: 'info',

    async execute(message, args) {
        const query = args.join(' ').trim();
        if (!query) return openNews(message, { title: 'News', topics: NEWS_TOPICS });
        return openNews(message, {
            title: 'News', note: query.slice(0, 40),
            topics: [['search', 'Search', () => searchNews(query)]],
        });
    },
};
