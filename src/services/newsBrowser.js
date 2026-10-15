/* ---
   author : cashholy (carti)
   module : newsBrowser
   --- */

// hope — news browser. One message: the story (headline, summary, picture),
// a headline picker, a topic switcher and a few buttons. Used by /news and
// /crypto news.

const {
  MessageFlags, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder,
} = require('discord.js');
const ui = require('./ui');
const emojis = require('../media/emojis.json');

const ID = { story: 'hnews_story', topic: 'hnews_topic', prev: 'hnews_prev', next: 'hnews_next', del: 'hnews_del' };

const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function ago(date) {
  const t = Date.parse(date);
  if (!t) return '';
  const m = Math.max(0, Math.round((Date.now() - t) / 6e4));
  if (m < 60) return `${m || 1}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

/**
 * @param ctx      message or interaction
 * @param opts.title    heading, e.g. "News"
 * @param opts.topics   [[key, label, loader]]  (loader returns articles)
 * @param opts.first    articles to start with, if already fetched
 * @param opts.topicKey key the first articles belong to
 * @param opts.note     small line under the heading (e.g. the search term)
 */
async function openNews(ctx, { title, topics, first = null, topicKey = null, note = '' }) {
  const user = ctx.user ?? ctx.author;
  if (typeof ctx.deferReply === 'function' && !ctx.deferred && !ctx.replied) await ctx.deferReply();

  const state = { topic: topicKey ?? topics[0][0], articles: first, at: 0 };
  if (!state.articles) {
    state.articles = await topics.find(t => t[0] === state.topic)[2]();
  }
  if (!state.articles.length) return ui.say.error(ctx, 'No stories found right now');

  const render = (disabled = false) => {
    const a = state.articles[state.at];
    const meta = [a.source, ago(a.date)].filter(Boolean).join('  ·  ');
    const head = a.url ? `## [${cut(a.title, 200)}](${a.url})` : `## ${cut(a.title, 200)}`;
    const body = `${head}\n${a.summary ? cut(a.summary, 380) : '-# No summary available'}\n-# ${meta}`;

    const box = ui.box();
    box.addTextDisplayComponents(ui.text(`-# ${title}${note ? `  ·  ${note}` : ''}  ·  ${state.at + 1} of ${state.articles.length}`));
    if (a.image) {
      box.addSectionComponents(new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(a.image)));
    } else {
      box.addTextDisplayComponents(ui.text(body));
    }
    box.addSeparatorComponents(ui.sep());

    box.addActionRowComponents(ui.row(ui.select(
      ID.story, 'Jump to a headline…',
      state.articles.slice(0, 25).map((x, i) => ({ label: cut(x.title, 100), value: String(i), description: x.source, default: i === state.at })),
      { disabled },
    )));
    if (topics.length > 1) {
      box.addActionRowComponents(ui.row(ui.select(
        ID.topic, 'Topic',
        topics.map(([key, label]) => ({ label, value: key, default: key === state.topic })),
        { disabled },
      )));
    }
    const buttons = [
      ui.btn(ID.prev, null, { style: 'primary', emoji: emojis.ArrowLeft, disabled: disabled || state.at === 0 }),
      ui.btn(ID.next, null, { style: 'primary', emoji: emojis.ArrowRight, disabled: disabled || state.at >= state.articles.length - 1 }),
    ];
    if (a.url) buttons.push(ui.link('Read article', a.url));
    buttons.push(ui.deleteBtn(ID.del).setDisabled(disabled));
    box.addActionRowComponents(ui.row(...buttons));
    return [box];
  };

  const msg = await ui.send(ctx, render());
  if (!msg || typeof msg.createMessageComponentCollector !== 'function') return msg;

  const collector = msg.createMessageComponentCollector({ filter: ui.onlyUser(user.id), time: 600000 });
  const flags = MessageFlags.IsComponentsV2;
  collector.on('collect', async (i) => {
    try {
      switch (i.customId) {
        case ID.story: state.at = Number(i.values[0]) || 0; return await i.update({ components: render(), flags });
        case ID.prev: state.at = Math.max(0, state.at - 1); return await i.update({ components: render(), flags });
        case ID.next: state.at = Math.min(state.articles.length - 1, state.at + 1); return await i.update({ components: render(), flags });
        case ID.topic: {
          await i.deferUpdate();
          const list = await topics.find(t => t[0] === i.values[0])[2]();
          if (list.length) { state.topic = i.values[0]; state.articles = list; state.at = 0; }
          return await i.editReply({ components: render(), flags });
        }
        case ID.del:
          collector.stop('deleted');
          await i.deferUpdate().catch(() => {});
          return await msg.delete().catch(() => {});
      }
    } catch (_) { /* expired */ }
  });
  collector.on('end', async (_c, reason) => {
    if (reason === 'deleted') return;
    try { await msg.edit({ components: render(true), flags }); } catch (_) {}
  });
  return msg;
}

module.exports = { openNews };
