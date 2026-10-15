// »» engineered by cashholy (carti) ««

// hope — Automod control panel (same live-panel pattern as Antinuke).

const ui = require('./ui');
const K = require('./guardKit');
const guardAI = require('./guardAI');
const { AutomodConfig, AutomodWhitelist, GuardSettings } = require('../database/schemas');

const { D, V2 } = K;

/* ── definitions ───────────────────────────────────────────────────── */

const FILTERS = [
  { key: 'antiSpam',        label: 'Spam',            description: 'Too many messages too fast' },
  { key: 'antiInvite',      label: 'Invites',         description: 'Discord invite links' },
  { key: 'antiLink',        label: 'Links',           description: 'Any external link' },
  { key: 'antiBadWords',    label: 'Word filter',     description: 'Your blocked word list' },
  { key: 'antiMassMention', label: 'Mass mentions',   description: 'Too many pings in one message' },
  { key: 'antiCaps',        label: 'Excessive caps',  description: 'Messages written in capitals' },
  { key: 'antiPing',        label: '@everyone pings', description: '@everyone and @here' },
];
const KEYS = FILTERS.map(f => f.key);
const punishKey = (k) => `${k}Punishment`;
const filterLabel = (k) => FILTERS.find(f => f.key === k)?.label ?? k;

const ACTIONS = [
  { value: 'delete', label: 'Delete',  description: 'Remove the message' },
  { value: 'warn',   label: 'Warn',    description: 'Delete and record a warning' },
  { value: 'mute',   label: 'Timeout', description: 'Delete and time the member out' },
  { value: 'kick',   label: 'Kick',    description: 'Delete and kick the member' },
  { value: 'ban',    label: 'Ban',     description: 'Delete and ban the member' },
];
const actionLabel = (v) => ACTIONS.find(a => a.value === v)?.label ?? v;

const PRESETS = {
  relaxed:  { label: 'Relaxed',  description: 'Spam, invites and mass mentions',  on: ['antiSpam', 'antiInvite', 'antiMassMention'], patch: { spamThreshold: 7, spamInterval: 5, mentionLimit: 8 } },
  balanced: { label: 'Balanced', description: 'Adds @everyone pings',             on: ['antiSpam', 'antiInvite', 'antiMassMention', 'antiPing'], patch: { spamThreshold: 5, spamInterval: 5, mentionLimit: 5 } },
  strict:   { label: 'Strict',   description: 'Every filter, tighter limits',     on: KEYS, patch: { spamThreshold: 4, spamInterval: 5, mentionLimit: 4, capsPercentage: 60 } },
};

const CATEGORIES = [
  { value: 'toxicity', label: 'Harassment and toxicity', description: 'Insults, bullying, targeted abuse' },
  { value: 'hate',     label: 'Hate speech',             description: 'Slurs and attacks on groups' },
  { value: 'scam',     label: 'Scams and phishing',      description: 'Fake giveaways, token grabbers' },
  { value: 'sexual',   label: 'Sexual content',          description: 'Explicit messages' },
  { value: 'threat',   label: 'Threats and violence',    description: 'Threats and self-harm pushing' },
];

const SECTIONS = [
  { label: 'Overview',      value: 'overview',   description: 'Status at a glance' },
  { label: 'Filters',       value: 'filters',    description: 'Choose what to catch' },
  { label: 'Actions',       value: 'actions',    description: 'What happens per filter' },
  { label: 'Exemptions',    value: 'exempt',     description: 'Roles, channels and members to skip' },
  { label: 'Word list',     value: 'words',      description: 'Blocked words' },
  { label: 'AI Moderation', value: 'ai',         description: 'Context-aware detection' },
  { label: 'Logs',          value: 'logs',       description: 'Where actions are posted' },
];

const ID = {
  master: 'am_master', nav: 'am_nav', setup: 'am_setup', reset: 'am_reset',
  filt: 'am_filt', tune: 'am_tune',
  pick: 'am_pick', act: 'am_act',
  exRole: 'am_ex_role', exChan: 'am_ex_chan', exUser: 'am_ex_user', exRem: 'am_ex_rem',
  wAdd: 'am_w_add', wRem: 'am_w_rem', wClear: 'am_w_clear',
  aiToggle: 'am_ai', aiCats: 'am_ai_cats', aiLevel: 'am_ai_level', aiAct: 'am_ai_act',
  logSel: 'am_log', logTest: 'am_log_test', logClear: 'am_log_clear',
};

/* ── data ──────────────────────────────────────────────────────────── */

const events = () => require('../events/automod/automodEvents');

async function loadState(guild) {
  const [row, ai, exempt] = await Promise.all([
    AutomodConfig.findOne({ where: { guildId: guild.id } }),
    GuardSettings.read(guild.id, 'automod'),
    AutomodWhitelist.findAll({ where: { guildId: guild.id } }),
  ]);
  return { row, ai, exempt };
}

async function save(guildId, patch) {
  const [row] = await AutomodConfig.findOrCreate({ where: { guildId }, defaults: { guildId } });
  await row.update(patch);
  events().bust(guildId);
  return row;
}

const activeKeys = (row) => (row ? KEYS.filter(k => row[k]) : []);
const parseWords = (raw) => [...new Set(String(raw).split(/[\n,]+/).map(w => w.trim().toLowerCase()).filter(w => w && w.length <= 40))];

function exemptName(guild, e) {
  if (e.targetType === 'role') return guild.roles.cache.get(e.targetId)?.name ?? e.targetId;
  if (e.targetType === 'channel') return guild.channels.cache.get(e.targetId)?.name ?? e.targetId;
  return guild.client.users.cache.get(e.targetId)?.username ?? e.targetId;
}
const exemptMention = (e) => (e.targetType === 'role' ? `<@&${e.targetId}>` : e.targetType === 'channel' ? `<#${e.targetId}>` : `<@${e.targetId}>`);

/* ── rendering ─────────────────────────────────────────────────────── */

function body(c, view, S, guild, st, disabled) {
  const { row, ai, exempt } = S;
  const act = activeKeys(row);
  const aiOk = guardAI.available();

  if (view === 'overview') {
    if (!row) {
      c.addSectionComponents(K.action(ID.setup, 'Not set up yet', 'Pick a preset, an action and a log channel.', 'Quick setup', { style: 'primary', disabled }));
      return;
    }
    const acts = new Set(KEYS.map(k => row[punishKey(k)] || row.punishment));
    c.addTextDisplayComponents(ui.text([
      `**Filters**  ${act.length} of ${KEYS.length} active`,
      `**Action**  ${acts.size === 1 ? actionLabel([...acts][0]) : 'Per filter'}`,
      `**Exempt**  ${exempt.length} ${exempt.length === 1 ? 'entry' : 'entries'}`,
      `**Word list**  ${row.getBadWords().length} words`,
      `**AI Moderation**  ${!aiOk ? 'Unavailable' : K.chip(ai.ai)}`,
      `**Logs**  ${K.chanLabel(guild, row.logChannelId)}`,
    ].join('\n')));
    c.addSeparatorComponents(ui.sep(false));
    c.addActionRowComponents(ui.row(
      ui.btn(ID.setup, 'Quick setup', { style: 'primary', disabled }),
      ui.btn(ID.reset, st.confirmReset ? 'Confirm reset' : 'Reset', { style: 'danger', disabled }),
    ));
  }

  if (view === 'filters') {
    c.addTextDisplayComponents(ui.text(`**Filters**\n-# ${act.length} of ${KEYS.length} active. Ticked items are enforced.`));
    c.addActionRowComponents(K.multi(ID.filt, 'Choose filters…', FILTERS.map(f => ({ label: f.label, value: f.key, description: f.description })), act, disabled));
    c.addSeparatorComponents(ui.sep(false));
    c.addSectionComponents(K.action(ID.tune, 'Limits',
      `Spam ${row?.spamThreshold ?? 5}/${row?.spamInterval ?? 5}s  ·  Mentions ${row?.mentionLimit ?? 5}  ·  Caps ${row?.capsPercentage ?? 70}%`, 'Edit', { disabled }));
  }

  if (view === 'actions') {
    const lines = FILTERS.map(f => `${f.label}  ·  **${actionLabel(row?.[punishKey(f.key)] || 'delete')}**`);
    c.addTextDisplayComponents(ui.text(`**Actions**\n-# Pick a filter, then what should happen.\n${lines.join('\n')}`));
    c.addActionRowComponents(K.single(ID.pick, 'Filter…', [{ value: 'all', label: 'All filters' }, ...FILTERS.map(f => ({ value: f.key, label: f.label }))], st.pick, disabled));
    c.addActionRowComponents(K.single(ID.act, 'Action…', ACTIONS,
      st.pick === 'all' ? null : (row?.[punishKey(st.pick)] || 'delete'), disabled));
  }

  if (view === 'exempt') {
    const list = exempt.length ? exempt.slice(0, 18).map(exemptMention).join('  ') + (exempt.length > 18 ? `  +${exempt.length - 18}` : '') : 'Nobody yet';
    c.addTextDisplayComponents(ui.text(`**Exemptions**\n-# These are skipped by every filter.\n${list}`));
    c.addActionRowComponents(ui.row(new D.RoleSelectMenuBuilder().setCustomId(ID.exRole).setPlaceholder('Exempt roles…').setMinValues(1).setMaxValues(10).setDisabled(disabled)));
    c.addActionRowComponents(ui.row(new D.ChannelSelectMenuBuilder().setCustomId(ID.exChan).setPlaceholder('Exempt channels…').setMinValues(1).setMaxValues(10).setDisabled(disabled)));
    c.addActionRowComponents(ui.row(new D.UserSelectMenuBuilder().setCustomId(ID.exUser).setPlaceholder('Exempt members…').setMinValues(1).setMaxValues(10).setDisabled(disabled)));
    if (exempt.length) {
      c.addActionRowComponents(K.single(ID.exRem, 'Remove an exemption…',
        exempt.slice(0, 25).map(e => ({ value: `${e.targetType}:${e.targetId}`, label: exemptName(guild, e), description: e.targetType })), null, disabled));
    }
  }

  if (view === 'words') {
    const words = row?.getBadWords() ?? [];
    const shown = words.length ? '||' + words.slice(0, 25).join(', ') + '||' + (words.length > 25 ? `  +${words.length - 25}` : '') : 'Empty';
    c.addTextDisplayComponents(ui.text(`**Word list**\n-# ${words.length} word${words.length === 1 ? '' : 's'}. Matches inside longer words too.\n${shown}`));
    c.addActionRowComponents(ui.row(
      ui.btn(ID.wAdd, 'Add', { style: 'primary', disabled }),
      ui.btn(ID.wRem, 'Remove', { disabled: disabled || !words.length }),
      ui.btn(ID.wClear, 'Clear all', { style: 'danger', disabled: disabled || !words.length }),
    ));
  }

  if (view === 'ai') {
    c.addSectionComponents(K.toggle(ID.aiToggle, 'AI Moderation', 'Reads messages in context, beyond keyword filters',
      ai.ai && aiOk, { disabled: disabled || !aiOk, label: aiOk ? undefined : 'Unavailable' }));
    c.addActionRowComponents(K.multi(ID.aiCats, 'What to detect…', CATEGORIES, ai.categories, disabled || !aiOk));
    c.addActionRowComponents(K.single(ID.aiLevel, 'Sensitivity…', [
      { value: 'lenient',  label: 'Lenient',  description: 'Only obvious violations' },
      { value: 'balanced', label: 'Balanced', description: 'Recommended' },
      { value: 'strict',   label: 'Strict',   description: 'Catches borderline messages' },
    ], ai.level, disabled || !aiOk));
    c.addActionRowComponents(K.single(ID.aiAct, 'When detected…', ACTIONS, ai.action, disabled || !aiOk));
  }

  if (view === 'logs') {
    c.addTextDisplayComponents(ui.text(`**Log channel**\n-# ${K.chanLabel(guild, row?.logChannelId)}`));
    const sel = new D.ChannelSelectMenuBuilder().setCustomId(ID.logSel).setPlaceholder('Choose a channel…')
      .setChannelTypes(D.ChannelType.GuildText, D.ChannelType.GuildAnnouncement).setDisabled(disabled);
    if (row?.logChannelId && guild.channels.cache.has(row.logChannelId)) sel.setDefaultChannels(row.logChannelId);
    c.addActionRowComponents(ui.row(sel));
    c.addActionRowComponents(ui.row(
      ui.btn(ID.logTest, 'Send test', { disabled: disabled || !row?.logChannelId }),
      ui.btn(ID.logClear, 'Clear', { disabled: disabled || !row?.logChannelId }),
    ));
  }
}

/* ── open ──────────────────────────────────────────────────────────── */

async function open(ctx) {
  const guild = ctx.guild;
  const user = ctx.user ?? ctx.author;
  if (!guild) return ui.say.error(ctx, 'Use this in a server');
  const member = ctx.member ?? await guild.members.fetch(user.id).catch(() => null);
  if (guild.ownerId !== user.id && !member?.permissions.has(D.PermissionFlagsBits.ManageGuild)) {
    return ui.say.error(ctx, 'You need **Manage Server** to use automod');
  }

  let S = await loadState(guild);
  const st = { view: 'overview', confirmReset: false, pick: 'all' };

  const render = (disabled = false, err = null) => {
    const c = ui.box(S.row?.enabled ? 'success' : 'base');
    c.addSectionComponents(K.header('Automod', 'Filters spam, links and abuse before it spreads.', ID.master, !!S.row?.enabled, disabled));
    c.addSeparatorComponents(ui.sep());
    c.addActionRowComponents(K.nav(ID.nav, SECTIONS, st.view, disabled));
    c.addSeparatorComponents(ui.sep(false));
    body(c, st.view, S, guild, st, disabled);
    const line = K.errorLine(err);
    if (line) { c.addSeparatorComponents(ui.sep(false)); c.addTextDisplayComponents(ui.text(line)); }
    return c;
  };
  const refresh = async () => { S = await loadState(guild); };
  const go = (i, work) => K.act(i, (d, e) => render(d, e), async () => { st.confirmReset = false; await work?.(); await refresh(); });

  const msg = await ui.send(ctx, render(), { extra: { allowedMentions: { parse: [] } } });
  if (!msg?.createMessageComponentCollector) return msg;

  const setupModal = () => K.modal(`am_setup_${msg.id}_${Date.now()}`, 'Quick setup',
    K.labelRadio('Preset', 'preset', Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label, description: p.description })), 'balanced'),
    K.labelRadio('Action', 'action', ACTIONS.filter(a => a.value !== 'warn'), 'delete'),
    K.labelChannel('Log channel', 'log', S.row?.logChannelId, 'Optional'),
    ...(guardAI.available() ? [K.labelCheck('AI Moderation', 'ai', S.ai.ai, 'Catch harassment, hate and scams with AI')] : []),
  );

  const wordsModal = (kind) => K.modal(`am_words_${kind}_${msg.id}_${Date.now()}`, kind === 'add' ? 'Add words' : 'Remove words',
    K.labelText('Words', 'words', { paragraph: true, required: true, max: 1000, placeholder: 'One per line, or separated by commas' }));

  K.mount(msg, {
    userId: user.id,
    render: (d) => render(d),
    handle: async (i) => {
      const id = i.customId;
      const v = i.values?.[0];

      if (id === ID.nav) { st.view = v; st.confirmReset = false; return go(i); }

      if (id === ID.setup || (id === ID.master && !S.row)) {
        return K.askModal(i, setupModal(), (d, e) => render(d, e), async (sub) => {
          const p = PRESETS[K.readRadio(sub, 'preset')] ?? PRESETS.balanced;
          const action = K.readRadio(sub, 'action') ?? 'delete';
          const patch = { enabled: true, punishment: action, ...p.patch };
          for (const k of KEYS) { patch[k] = p.on.includes(k) || (k === 'antiBadWords' && p.on.includes(k)); patch[punishKey(k)] = action; }
          patch.logChannelId = K.readChannel(sub, 'log') ?? S.row?.logChannelId ?? null;
          await save(guild.id, patch);
          if (guardAI.available()) await GuardSettings.write(guild.id, 'automod', { ai: K.readCheck(sub, 'ai'), action: action === 'warn' ? 'delete' : action });
          st.view = 'overview';
          await refresh();
        });
      }

      if (id === ID.master) return go(i, () => save(guild.id, { enabled: !S.row.enabled }));

      if (id === ID.reset) {
        if (!st.confirmReset) { st.confirmReset = true; await i.deferUpdate(); return i.editReply({ components: [render()], flags: V2 }); }
        return go(i, async () => {
          await AutomodConfig.destroy({ where: { guildId: guild.id } });
          await AutomodWhitelist.destroy({ where: { guildId: guild.id } });
          await GuardSettings.clear(guild.id, 'automod');
          events().bust(guild.id);
        });
      }

      if (id === ID.filt) return go(i, () => save(guild.id, Object.fromEntries(KEYS.map(k => [k, i.values.includes(k)]))));

      if (id === ID.tune) {
        const r = S.row;
        return K.askModal(i, K.modal(`am_tune_${msg.id}_${Date.now()}`, 'Limits',
          K.labelText('Spam: messages allowed', 'sm', { value: r?.spamThreshold ?? 5, min: 1, max: 2, required: true, description: 'Per time window (2-30)' }),
          K.labelText('Spam: window in seconds', 'ss', { value: r?.spamInterval ?? 5, min: 1, max: 2, required: true, description: '1-60' }),
          K.labelText('Mentions allowed per message', 'mm', { value: r?.mentionLimit ?? 5, min: 1, max: 2, required: true, description: '1-30' }),
          K.labelText('Caps limit in percent', 'cp', { value: r?.capsPercentage ?? 70, min: 2, max: 3, required: true, description: '30-100' }),
          K.labelText('Timeout length in minutes', 'tm', { value: Math.round((r?.muteDuration ?? 300) / 60), min: 1, max: 4, required: true, description: '1-10080' }),
        ), (d, e) => render(d, e), async (sub) => {
          const n = (key) => Number(K.readText(sub, key));
          const inRange = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
          const [sm, ss, mm, cp, tm] = [n('sm'), n('ss'), n('mm'), n('cp'), n('tm')];
          if (!inRange(sm, 2, 30)) throw new Error('Spam messages must be 2 to 30');
          if (!inRange(ss, 1, 60)) throw new Error('Spam window must be 1 to 60 seconds');
          if (!inRange(mm, 1, 30)) throw new Error('Mentions must be 1 to 30');
          if (!inRange(cp, 30, 100)) throw new Error('Caps limit must be 30 to 100');
          if (!inRange(tm, 1, 10080)) throw new Error('Timeout must be 1 to 10080 minutes');
          await save(guild.id, { spamThreshold: sm, spamInterval: ss, mentionLimit: mm, capsPercentage: cp, muteDuration: tm * 60 });
          await refresh();
        });
      }

      if (id === ID.pick) return go(i, async () => { st.pick = v; });
      if (id === ID.act) {
        return go(i, () => save(guild.id, st.pick === 'all'
          ? { punishment: v, ...Object.fromEntries(KEYS.map(k => [punishKey(k), v])) }
          : { [punishKey(st.pick)]: v }));
      }

      const addExempt = (type) => go(i, async () => {
        for (const tid of i.values) {
          await AutomodWhitelist.findOrCreate({ where: { guildId: guild.id, targetId: tid }, defaults: { guildId: guild.id, targetId: tid, targetType: type, modules: '[]' } });
        }
        events().bust(guild.id);
      });
      if (id === ID.exRole) return addExempt('role');
      if (id === ID.exChan) return addExempt('channel');
      if (id === ID.exUser) return addExempt('user');
      if (id === ID.exRem) {
        return go(i, async () => { await AutomodWhitelist.destroy({ where: { guildId: guild.id, targetId: v.split(':')[1] } }); events().bust(guild.id); });
      }

      if (id === ID.wAdd || id === ID.wRem) {
        const kind = id === ID.wAdd ? 'add' : 'remove';
        return K.askModal(i, wordsModal(kind), (d, e) => render(d, e), async (sub) => {
          const list = parseWords(K.readText(sub, 'words'));
          if (!list.length) throw new Error('No valid words found');
          const row = S.row ?? (await save(guild.id, {}));
          const cur = row.getBadWords();
          const next = kind === 'add' ? [...new Set([...cur, ...list])] : cur.filter(w => !list.includes(w));
          if (next.length > 500) throw new Error('The list is limited to 500 words');
          await row.setBadWords(next);
          events().bust(guild.id);
          await refresh();
        });
      }
      if (id === ID.wClear) return go(i, async () => { await S.row.setBadWords([]); events().bust(guild.id); });

      if (id === ID.aiToggle) return go(i, () => GuardSettings.write(guild.id, 'automod', { ai: !S.ai.ai }));
      if (id === ID.aiCats) {
        if (!i.values.length) return go(i);
        return go(i, () => GuardSettings.write(guild.id, 'automod', { categories: i.values }));
      }
      if (id === ID.aiLevel) return go(i, () => GuardSettings.write(guild.id, 'automod', { level: v }));
      if (id === ID.aiAct) return go(i, () => GuardSettings.write(guild.id, 'automod', { action: v }));

      if (id === ID.logSel) return go(i, () => save(guild.id, { logChannelId: i.values[0] }));
      if (id === ID.logClear) return go(i, () => save(guild.id, { logChannelId: null }));
      if (id === ID.logTest) {
        return go(i, async () => { if (!await events().sendTest(guild, S.row, user)) throw new Error('I cannot post in that channel'); });
      }
    },
  });
  return msg;
}

module.exports = { open, FILTERS, KEYS, ACTIONS, CATEGORIES };
