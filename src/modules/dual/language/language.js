/** @author cashholy (carti) */

// hope — /language (alias: lang)
//
// A small container with one dropdown. The choice is saved per USER, so it
// follows the person into every server and DM and never touches anyone else's
// setting — two members of the same server can use different languages.
//
//   /language          → opens the menu (only you can use it)
//   ,language          → same, with the prefix
//   ,language hindi    → sets it directly (code, English name or native name)
//
// "Automatic" goes back to following the Discord client language.

const { SlashCommandBuilder, ComponentType, MessageFlags } = require('discord.js');
const ui = require('../../../services/ui');
const i18n = require('../../../localization');

const ID = 'hope_lang_select';
const AUTO = 'auto';
const V2 = MessageFlags.IsComponentsV2;

const label = (code) => {
  const l = i18n.byCode.get(code) ?? i18n.byCode.get(i18n.DEFAULT);
  return `${l.flag} ${l.native}`;
};

function build(userId, tr, note, disabled = false) {
  const isAuto = i18n.sourceOf(userId) !== 'manual';
  const current = label(tr.lang) + (isAuto ? ` · ${tr('language.autoLabel')}` : '');

  const options = [
    { label: tr('language.autoLabel'), value: AUTO, description: tr('language.autoDesc'), emoji: '🌐', default: isAuto },
    ...i18n.LANGUAGES.map(l => ({
      label: l.native, value: l.code, description: l.name, emoji: l.flag, default: !isAuto && l.code === tr.lang,
    })),
  ];

  const c = ui.box();
  c.addTextDisplayComponents(ui.text(`### ${tr('language.title')}`));
  c.addTextDisplayComponents(ui.text(tr('language.current', { language: current })));
  c.addActionRowComponents(ui.row(ui.select(ID, tr('language.placeholder'), options, { disabled })));
  if (note) c.addTextDisplayComponents(ui.text(note));
  c.addSeparatorComponents(ui.sep(false));
  c.addTextDisplayComponents(ui.text(ui.sub(tr('language.scope'))));
  return c;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('language')
    .setDescription('Choose the language I use for you')
    .setDescriptionLocalizations(i18n.descriptionLocalizations('slash.language')),

  name: 'language',
  aliases: ['lang', 'setlang'],
  description: 'Choose the language I use for you',
  category: 'information',

  async execute(ctx, args = []) {
    const user = ctx.user ?? ctx.author;
    const isSlash = ctx.isChatInputCommand?.() === true;
    let tr = i18n.translator(ctx, 'language');

    // ,language hi  → set directly (prefix only)
    if (!isSlash && args.length) {
      const code = i18n.resolveCode(args.join(' '));
      if (!code) return ui.say.error(ctx, tr('language.unknown'));
      const lang = i18n.setLanguage(user.id, code, { source: 'manual' });
      const done = i18n.translatorFor(lang);
      return ui.say.success(ctx, done('language.saved', { language: label(lang) }));
    }

    const msg = await ui.send(ctx, build(user.id, tr), { ephemeral: isSlash });
    if (!msg?.createMessageComponentCollector) return msg;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000,
      // anyone else who touches the menu gets a private notice in THEIR own language
      filter: async (i) => {
        if (i.user.id === user.id) return true;
        try {
          await i.reply({
            components: [ui.fail(i18n.translator(i, 'language')('language.notYours'))],
            flags: V2 | MessageFlags.Ephemeral,
          });
        } catch (_) { /* expired */ }
        return false;
      },
    });

    collector.on('collect', async (i) => {
      try {
        const v = i.values[0];
        if (v !== AUTO && !i18n.isSupported(v)) return await i.deferUpdate();

        const lang = v === AUTO
          ? i18n.setLanguage(user.id, null, { source: 'auto', interaction: i })
          : i18n.setLanguage(user.id, v, { source: 'manual' });

        tr = i18n.translatorFor(lang);
        const note = `${ui.ICON.success} ${tr(v === AUTO ? 'language.autoSaved' : 'language.saved', { language: label(lang) })}`;
        await i.update({ components: [build(user.id, tr, note)], flags: V2 });
      } catch (err) {
        console.error('[language]', err.message);
      }
    });

    collector.on('end', async () => {
      const closed = { components: [build(user.id, tr, null, true)], flags: V2 };
      try { await (isSlash ? ctx.editReply(closed) : msg.edit(closed)); } catch (_) { /* gone */ }
    });

    return msg;
  },
};
