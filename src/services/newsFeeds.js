/**
 * ┌ cashholy (carti)
 * └ services/newsFeeds.js
 */

// hope — news sources. Every fetcher returns the same shape:
//   { title, summary, url, source, image, date }

const axios = require('axios');
const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 8000,
  customFields: { item: [['media:content', 'media'], ['media:thumbnail', 'thumb']] },
});

const clean = (html) => String(html || '')
  .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

const validUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null);

function fromFeed(feed, source, limit = 10) {
  return (feed.items || []).slice(0, limit).map(i => ({
    title: clean(i.title) || 'Untitled',
    summary: clean(i.contentSnippet || i.content || i.description || ''),
    url: validUrl(i.link),
    source,
    image: validUrl(i.enclosure?.url) || validUrl(i.media?.$?.url) || validUrl(i.thumb?.$?.url),
    date: i.isoDate || i.pubDate || null,
  }));
}

async function rss(url, source, limit) {
  try { return fromFeed(await parser.parseURL(url), source, limit); } catch (_) { return []; }
}

async function saurav(category, limit = 12) {
  try {
    const res = await axios.get(`https://saurav.tech/NewsAPI/top-headlines/category/${category}/us.json`, { timeout: 8000 });
    return (res.data.articles || []).slice(0, limit).map(a => ({
      title: clean(a.title) || 'Untitled',
      summary: clean(a.description || a.content),
      url: validUrl(a.url),
      source: a.source?.name || 'News',
      image: validUrl(a.urlToImage),
      date: a.publishedAt || null,
    }));
  } catch (_) { return []; }
}

const dedupe = (list) => {
  const seen = new Set();
  return list.filter(a => a.url && !seen.has(a.url) && seen.add(a.url));
};

/** General news topics: [key, label, loader(query)] */
const NEWS_TOPICS = [
  ['top', 'Top stories', async () => {
    const [a, b, c] = await Promise.all([saurav('general', 6), rss('https://feeds.bbci.co.uk/news/rss.xml', 'BBC News', 6), rss('https://techcrunch.com/feed/', 'TechCrunch', 4)]);
    return dedupe([a[0], b[0], c[0], a[1], b[1], a[2], b[2], c[1], a[3], b[3], c[2], a[4], b[4]].filter(Boolean));
  }],
  ['world', 'World', () => rss('https://feeds.bbci.co.uk/news/world/rss.xml', 'BBC World', 12)],
  ['technology', 'Technology', () => saurav('technology')],
  ['business', 'Business', () => saurav('business')],
  ['science', 'Science', () => saurav('science')],
  ['health', 'Health', () => saurav('health')],
  ['sports', 'Sports', () => saurav('sports')],
  ['entertainment', 'Entertainment', () => saurav('entertainment')],
];

const CRYPTO_TOPICS = [
  ['latest', 'Latest', () => rss('https://news.bitcoin.com/feed/', 'Bitcoin.com', 15)],
  ['cointelegraph', 'Cointelegraph', () => rss('https://cointelegraph.com/rss', 'Cointelegraph', 15)],
  ['decrypt', 'Decrypt', () => rss('https://decrypt.co/feed', 'Decrypt', 15)],
];

/** Search results from Google News. */
async function searchNews(query) {
  return rss(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`, 'Google News', 15);
}

module.exports = { NEWS_TOPICS, CRYPTO_TOPICS, searchNews };
