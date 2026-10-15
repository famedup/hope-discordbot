// @cashholy(carti) — antinukePanel

// hope — Antinuke control panel.
// One live message: header with the master switch, a jump menu, and a body
// that changes per section. All edits apply instantly; nothing needs a wizard.

const ui = require('./ui');
const K = require('./guardKit');
const guardAI = require('./guardAI');
const { AntinukeConfig, AntinukeWhitelist, GuardSettings } = require('../database/schemas');

const { D, V2 } = K;
const P = D.PermissionFlagsBits;

/* ── definitions ───────────────────────────────────────────────────── */

const PROTECTIONS = [
  { key: 'antiBan',           label: 'Mass bans',          description: 'Banning many members quickly' },
  { key: 'antiKick',          label: 'Mass kicks',         description: 'Kicking many members quickly' },
  { key: 'antiBot',           label: 'Unapproved bots',    description: 'Bots added by untrusted members' },
  { key: 'antiChannelCreate', label: 'Channel spam',       description: 'Creating channels in bulk' },
  { key: 'antiChannelDelete', label: 'Channel deletion',   description: 'Deleting channels in bulk' },
  { key: 'antiChannelEdit',   label: 'Channel edits',      description: 'Rewriting channels in bulk' },
  { key: 'antiRoleCreate',    label: 'Role spam',          description: 'Creating roles in bulk' },
  { key: 'antiRoleDelete',    label: 'Role deletion',      description: 'Deleting roles in bulk' },
  { key: 'antiRoleUpdate',    label: 'Dangerous role edits', description: 'Granting admin-level permissions' },
  { key: 'antiWebhook',       label: 'Webhook spam',       description: 'Creating webhooks' },
  { key: 'antiGuildUpdate',   label: 'Server edits',       description: 'Changing server settings' },
  { key: 'antiEmoji',         label: 'Emoji changes',      description: 'Adding or deleting emojis' },
];
const KEYS = PROTECTIONS.map(p => p.key);
const RECOMMENDED = ['antiBan', 'antiKick', 'antiBot', 'antiChannelCreate', 'antiChannelDelete', 'antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate', 'antiWebhook'];

const PUNISH = [
  { value: 'stripall', label: 'Strip roles', description: 'Remove every role the member has' },
  { value: 'kick',     label: 'Kick',        description: 'Remove them from the server' },
  { value: 'ban',      label: 'Ban',         description: 'Ban them from the server' },
];
const punishLabel = (v) => PUNISH.find(p => p.value === v)?.label ?? v;

const PRESETS = {
  relaxed:  { label: 'Relaxed',  description: '5 actions in 60s, core protections', threshold: 5, timeframe: 60, on: ['antiBan', 'antiKick', 'antiBot', 'antiChannelDelete', 'antiRoleDelete', 'antiRoleUpdate'] },
  balanced: { label: 'Balanced', description: '3 actions in 60s, recommended set',  threshold: 3, timeframe: 60, on: RECOMMENDED },
  strict:   { label: 'Strict',   description: '2 actions in 45s, everything on',    threshold: 2, timeframe: 45, on: KEYS },
};

const SECTIONS = [
  { label: 'Overview',     value: 'overview',    description: 'Status at a glance' },
  { label: 'Protections',  value: 'protections', description: 'Choose what to watch' },
  { label: 'Response',     value: 'response',    description: 'Limit and punishment' },
  { label: 'Trusted',      value: 'trusted',     description: 'Members who can act freely' },
  { label: 'Access',       value: 'access',      description: 'Extra owners and admins' },
  { label: 'AI Guard',     value: 'ai',          description: 'Smart attack detection' },
  { label: 'Logs',         value: 'logs',        description: 'Where alerts are sent' },
];

const ID = {
  master: 'an_master', nav: 'an_nav', setup: 'an_setup', scan: 'an_scan', reset: 'an_reset',
  prot: 'an_prot', recommended: 'an_rec', all: 'an_all', none: 'an_none',
  punish: 'an_punish', limit: 'an_limit',
  trustAdd: 'an_t_add', trustRem: 'an_t_rem',
  ownerAdd: 'an_o_add', adminAdd: 'an_a_add', accessRem: 'an_acc_rem',
  aiToggle: 'an_ai', aiLevel: 'an_ai_level',
  logSel: 'an_log', logTest: 'an_log_test', logClear: 'an_log_clear',
};

/* ── data ──────────────────────────────────────────────────────────── */

const events = () => require('../events/antinuke/antinukeEvents');

/* ── access levels ─────────────────────────────────────────────────── */
// owner   everything, including who the extra owners are
// extra   everything except managing extra owners (also never punished)
// admin   protections, response, trusted, AI Guard, logs, scan; cannot switch it
//         off, reset it, or manage access
const RANK = { owner: 3, extra: 2, admin: 1 };
const NEEDS = {
  [ID.master]: 2, [ID.reset]: 2, [ID.adminAdd]: 2, [ID.ownerAdd]: 3, [ID.accessRem]: 2,
};

/** 'owner' | 'extra' | 'admin' | null for a member of this guild. */
async function accessOf(guild, userId) {
  if (guild.ownerId === userId) return 'owner';
  const ai = await GuardSettings.read(guild.id, 'antinuke');
  if (ai.extraOwners.includes(userId)) return 'extra';
  if (ai.admins.includes(userId)) return 'admin';
  return null;
}


async function loadState(guild) {
  const [row, ai, trusted] = await Promise.all([
    AntinukeConfig.findOne({ where: { guildId: guild.id } }),
    GuardSettings.read(guild.id, 'antinuke'),
    AntinukeWhitelist.findAll({ where: { guildId: guild.id } }),
  ]);
  const names = new Map();
  const ids = [...new Set([...trusted.slice(0, 25).map(t => t.userId), ...ai.extraOwners, ...ai.admins])];
  await Promise.all(ids.map(async (uid) => {
    const u = guild.client.users.cache.get(uid) ?? await guild.client.users.fetch(uid).catch(() => null);
    names.set(uid, u?.username ?? uid);
  }));
  return { row, ai, trusted, names };
}

async function save(guildId, patch) {
  const [row] = await AntinukeConfig.findOrCreate({ where: { guildId }, defaults: { guildId } });
  await row.update(patch);
  events().bust(guildId);
  return row;
}

const activeKeys = (row) => (row ? KEYS.filter(k => row[k]) : []);

/* ── security scan (works without AI; AI only writes the summary) ───── */

const DANGEROUS = [P.Administrator, P.ManageGuild, P.ManageRoles, P.ManageChannels, P.BanMembers, P.KickMembers, P.ManageWebhooks];

async function scan(guild, row) {
  await guild.roles.fetch().catch(() => null);
  if (guild.memberCount <= 5000) await guild.members.fetch().catch(() => null);
  const me = guild.members.me;
  const findings = [];
  const add = (sev, title, detail, cost) => findings.push({ sev, title, detail, cost });

  const everyone = guild.roles.everyone;
  if (DANGEROUS.some(p => everyone.permissions.has(p))) {
    add('High', '@everyone has moderator permissions', 'Everyone in the server can use powerful permissions. Remove them from the @everyone role.', 35);
  }
  if (everyone.permissions.has(P.MentionEveryone)) {
    add('Low', '@everyone can mention everyone', 'Members can ping the whole server.', 5);
  }

  const humans = guild.members.cache.filter(m => !m.user.bot && m.id !== guild.ownerId);
  const admins = humans.filter(m => m.permissions.has(P.Administrator));
  if (admins.size > 3) add('Medium', `${admins.size} members have Administrator`, 'Keep admin to as few people as possible.', Math.min(20, admins.size * 3));

  const adminBots = guild.members.cache.filter(m => m.user.bot && m.id !== me.id && m.permissions.has(P.Administrator));
  if (adminBots.size) add('Medium', `${adminBots.size} bot${adminBots.size > 1 ? 's' : ''} with Administrator`, 'Give bots only the permissions they need.', Math.min(15, adminBots.size * 6));

  const above = guild.roles.cache.filter(r => !r.managed && r.id !== guild.id && r.position >= me.roles.highest.position && DANGEROUS.some(p => r.permissions.has(p)));
  if (above.size) add('High', 'My role is below powerful roles', `I cannot punish members holding ${above.size} higher role${above.size > 1 ? 's' : ''}. Move my role to the top.`, 25);

  if (guild.mfaLevel === 0 && DANGEROUS.some(p => humans.some(m => m.permissions.has(p)))) {
    add('Medium', '2FA is not required for moderators', 'Turn on "Require 2FA for moderation" in Server Settings.', 12);
  }
  if (guild.verificationLevel === 0) add('Low', 'No verification level', 'New accounts can join and post immediately.', 6);
  if (guild.explicitContentFilter === 0) add('Low', 'Media scanning is off', 'Enable explicit media filtering in Safety Setup.', 4);

  if (!row?.enabled) add('High', 'Antinuke is off', 'Switch it on to protect against mass actions.', 20);
  else if (!row.logChannelId) add('Low', 'No alert channel', 'Pick one under Logs so alerts reach you.', 3);

  const score = Math.max(0, 100 - findings.reduce((n, f) => n + f.cost, 0));
  findings.sort((a, b) => b.cost - a.cost);
  const summary = guardAI.available() ? await guardAI.summariseFindings(guild.name, score, findings) : null;
  return { score, findings, summary };
}

function scanEmbed(guild, result) {
  const { score, findings, summary } = result;
  const grade = score >= 85 ? 'Strong' : score >= 60 ? 'Fair' : 'At risk';
  const desc = [`**${score}** / 100  ·  ${grade}`, summary].filter(Boolean).join('\n\n');
  return ui.embed({
    kind: score >= 85 ? 'success' : score >= 60 ? 'warning' : 'error',
    author: { name: guild.name, iconURL: guild.iconURL({ size: 64 }) ?? undefined },
    title: 'Security scan',
    description: desc,
    fields: findings.slice(0, 6).map(f => ({ name: `${f.sev}  ·  ${f.title}`, value: f.detail })),
    footer: findings.length ? `${findings.length} finding${findings.length > 1 ? 's' : ''}` : 'Nothing to fix',
    timestamp: true,
  });
}

/* ── rendering ─────────────────────────────────────────────────────── */

function body(c, view, S, guild, disabled, confirmReset, level) {
  const { row, ai, trusted } = S;
  const act = activeKeys(row);
  const aiOk = guardAI.available();

  if (view === 'overview') {
    if (!row) {
      c.addSectionComponents(K.action(ID.setup, 'Not set up yet', 'Pick a preset, a response and a log channel.', 'Quick setup', { style: 'primary', disabled }));
      return;
    }
    c.addTextDisplayComponents(ui.text([
      `**Protections**  ${act.length} of ${KEYS.length} active`,
      `**Limit**  ${row.threshold} actions within ${row.timeframe}s`,
      `**Response**  ${punishLabel(row.punishment)}`,
      `**Trusted**  ${trusted.length} member${trusted.length === 1 ? '' : 's'}`,
      `**Access**  ${ai.extraOwners.length} extra owner${ai.extraOwners.length === 1 ? '' : 's'}, ${ai.admins.length} admin${ai.admins.length === 1 ? '' : 's'}`,
      `**AI Guard**  ${!aiOk ? 'Unavailable' : K.chip(ai.ai)}`,
      `**Logs**  ${K.chanLabel(guild, row.logChannelId)}`,
    ].join('\n')));
    c.addSeparatorComponents(ui.sep(false));
    c.addActionRowComponents(ui.row(
      ui.btn(ID.setup, 'Quick setup', { style: 'primary', disabled }),
      ui.btn(ID.scan, 'Scan server', { disabled }),
      ui.btn(ID.reset, confirmReset ? 'Confirm reset' : 'Reset', { style: 'danger', disabled }),
    ));
  }

  if (view === 'protections') {
    c.addTextDisplayComponents(ui.text(`**Protections**\n-# ${act.length} of ${KEYS.length} active. Ticked items are watched.`));
    c.addActionRowComponents(K.multi(ID.prot, 'Choose protections…',
      PROTECTIONS.map(p => ({ label: p.label, value: p.key, description: p.description })), act, disabled));
    c.addActionRowComponents(ui.row(
      ui.btn(ID.recommended, 'Recommended', { disabled }),
      ui.btn(ID.all, 'Everything', { disabled }),
      ui.btn(ID.none, 'None', { disabled }),
    ));
  }

  if (view === 'response') {
    c.addTextDisplayComponents(ui.text('**Punishment**\n-# Applied when someone crosses the limit.'));
    c.addActionRowComponents(K.single(ID.punish, 'Choose a punishment…', PUNISH, row?.punishment ?? 'stripall', disabled));
    c.addSeparatorComponents(ui.sep(false));
    c.addSectionComponents(K.action(ID.limit, 'Limit', `${row?.threshold ?? 3} actions within ${row?.timeframe ?? 60} seconds`, 'Edit', { disabled }));
  }

  if (view === 'trusted') {
    const list = trusted.length ? trusted.slice(0, 20).map(t => `<@${t.userId}>`).join('  ') + (trusted.length > 20 ? `  +${trusted.length - 20}` : '') : 'No one yet';
    c.addTextDisplayComponents(ui.text(`**Trusted members**\n-# They are never punished by antinuke.\n${list}`));
    c.addActionRowComponents(ui.row(new D.UserSelectMenuBuilder().setCustomId(ID.trustAdd).setPlaceholder('Add trusted members…')
      .setMinValues(1).setMaxValues(10).setDisabled(disabled)));
    if (trusted.length) {
      c.addActionRowComponents(K.single(ID.trustRem, 'Remove a member…',
        trusted.slice(0, 25).map(t => ({ label: S.names.get(t.userId) ?? t.userId, value: t.userId, description: t.userId })), null, disabled));
    }
  }

  if (view === 'access') {
    const fmt = (ids) => (ids.length ? ids.map(u => `<@${u}>`).join('  ') : 'None');
    c.addTextDisplayComponents(ui.text([
      '**Access**',
      '-# Extra owners have full control. Admins can tune protections but cannot disable, reset or manage access.',
      `Owner  <@${guild.ownerId}>`,
      `Extra owners  ${fmt(ai.extraOwners)}`,
      `Admins  ${fmt(ai.admins)}`,
    ].join('\n')));
    c.addActionRowComponents(ui.row(new D.UserSelectMenuBuilder().setCustomId(ID.ownerAdd).setPlaceholder('Add extra owners…')
      .setMinValues(1).setMaxValues(5).setDisabled(disabled || level < 3)));
    c.addActionRowComponents(ui.row(new D.UserSelectMenuBuilder().setCustomId(ID.adminAdd).setPlaceholder('Add admins…')
      .setMinValues(1).setMaxValues(10).setDisabled(disabled || level < 2)));
    const people = [
      ...ai.extraOwners.map(u => ({ value: `extra:${u}`, label: S.names.get(u) ?? u, description: 'Extra owner', who: u, kind: 'extra' })),
      ...ai.admins.map(u => ({ value: `admin:${u}`, label: S.names.get(u) ?? u, description: 'Admin', who: u, kind: 'admin' })),
    ].filter(o => (o.kind === 'extra' ? level >= 3 : level >= 2)).slice(0, 25);
    if (people.length) c.addActionRowComponents(K.single(ID.accessRem, 'Remove access…', people, null, disabled));
  }

  if (view === 'ai') {
    c.addSectionComponents(K.toggle(ID.aiToggle, 'AI Guard', 'Reviews suspicious activity before the limit is reached',
      ai.ai && aiOk, { disabled: disabled || !aiOk, label: aiOk ? undefined : 'Unavailable' }));
    c.addActionRowComponents(K.single(ID.aiLevel, 'Sensitivity…', [
      { value: 'balanced', label: 'Balanced', description: 'Acts on clear attack patterns' },
      { value: 'strict',   label: 'Strict',   description: 'Acts earlier on weaker signals' },
    ], ai.level, disabled || !aiOk));
    c.addSeparatorComponents(ui.sep(false));
    c.addSectionComponents(K.action(ID.scan, 'Security scan', 'Checks permissions, bots and server settings', 'Run scan', { disabled }));
  }

  if (view === 'logs') {
    c.addTextDisplayComponents(ui.text(`**Alert channel**\n-# ${K.chanLabel(guild, row?.logChannelId)}`));
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
  const access = await accessOf(guild, user.id);
  if (!access) return ui.say.error(ctx, 'Only the server owner, extra owners and admins can use antinuke');

  let S = await loadState(guild);
  const state = { view: 'overview', confirmReset: false, access };

  const render = (disabled = false, err = null) => {
    const c = ui.box(S.row?.enabled ? 'success' : 'base');
    c.addSectionComponents(K.header('Antinuke', 'Stops mass bans, deletions and rogue bots.', ID.master, !!S.row?.enabled, disabled));
    c.addSeparatorComponents(ui.sep());
    c.addActionRowComponents(K.nav(ID.nav, SECTIONS, state.view, disabled));
    c.addSeparatorComponents(ui.sep(false));
    body(c, state.view, S, guild, disabled, state.confirmReset, RANK[state.access] ?? 0);
    const line = K.errorLine(err);
    if (line) { c.addSeparatorComponents(ui.sep(false)); c.addTextDisplayComponents(ui.text(line)); }
    return c;
  };
  const refresh = async () => { S = await loadState(guild); };
  const go = (i, work) => K.act(i, (d, e) => render(d, e), async () => { state.confirmReset = false; await work?.(); await refresh(); });

  const msg = await ui.send(ctx, render(), { extra: { allowedMentions: { parse: [] } } });
  if (!msg?.createMessageComponentCollector) return msg;

  /** Quick setup modal. */
  const setupModal = () => K.modal(`an_setup_${msg.id}_${Date.now()}`, 'Quick setup',
    K.labelRadio('Preset', 'preset', Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label, description: p.description })), 'balanced'),
    K.labelRadio('Punishment', 'punish', PUNISH, S.row?.punishment ?? 'stripall'),
    K.labelChannel('Alert channel', 'log', S.row?.logChannelId, 'Optional'),
    ...(guardAI.available() ? [K.labelCheck('AI Guard', 'ai', S.ai.ai, 'Review suspicious activity with AI')] : []),
  );

  K.mount(msg, {
    userId: user.id,
    render: (d) => render(d),
    handle: async (i) => {
      const id = i.customId;
      const v = i.values?.[0];

      // access can change while the panel is open, so check it on every click
      state.access = await accessOf(guild, user.id);
      if (!state.access) return i.reply({ components: [ui.fail('You no longer have access')], flags: V2 | D.MessageFlags.Ephemeral });
      if ((RANK[state.access] ?? 0) < (NEEDS[id] ?? 1)) {
        return i.reply({ components: [ui.fail(NEEDS[id] === 3 ? 'Only the server owner can do that' : 'Only owners can do that')], flags: V2 | D.MessageFlags.Ephemeral });
      }

      if (id === ID.nav) { state.view = v; state.confirmReset = false; return go(i); }

      if (id === ID.setup || (id === ID.master && !S.row)) {
        return K.askModal(i, setupModal(), (d, e) => render(d, e), async (sub) => {
          const p = PRESETS[K.readRadio(sub, 'preset')] ?? PRESETS.balanced;
          const patch = { enabled: true, threshold: p.threshold, timeframe: p.timeframe, punishment: K.readRadio(sub, 'punish') ?? 'stripall' };
          for (const k of KEYS) patch[k] = p.on.includes(k);
          const ch = K.readChannel(sub, 'log');
          patch.logChannelId = ch ?? S.row?.logChannelId ?? null;
          await save(guild.id, patch);
          if (guardAI.available()) await GuardSettings.write(guild.id, 'antinuke', { ai: K.readCheck(sub, 'ai') });
          state.view = 'overview';
          await refresh();
        });
      }

      if (id === ID.master) return go(i, () => save(guild.id, { enabled: !S.row.enabled }));

      if (id === ID.scan) {
        await i.deferReply({ flags: D.MessageFlags.Ephemeral });
        try {
          const result = await scan(guild, S.row);
          await i.editReply({ embeds: [scanEmbed(guild, result)] });
        } catch (e) {
          console.error('[antinuke scan]', e);
          await i.editReply({ components: [ui.fail('Scan failed. Try again')], flags: V2 }).catch(() => {});
        }
        return;
      }

      if (id === ID.reset) {
        if (!state.confirmReset) { state.confirmReset = true; await i.deferUpdate(); return i.editReply({ components: [render()], flags: V2 }); }
        return go(i, async () => {
          await AntinukeConfig.destroy({ where: { guildId: guild.id } });
          await AntinukeWhitelist.destroy({ where: { guildId: guild.id } });
          await GuardSettings.clear(guild.id, 'antinuke');
          events().bust(guild.id);
        });
      }

      if (id === ID.prot) return go(i, () => save(guild.id, Object.fromEntries(KEYS.map(k => [k, i.values.includes(k)]))));
      if (id === ID.recommended) return go(i, () => save(guild.id, Object.fromEntries(KEYS.map(k => [k, RECOMMENDED.includes(k)]))));
      if (id === ID.all) return go(i, () => save(guild.id, Object.fromEntries(KEYS.map(k => [k, true]))));
      if (id === ID.none) return go(i, () => save(guild.id, Object.fromEntries(KEYS.map(k => [k, false]))));

      if (id === ID.punish) return go(i, () => save(guild.id, { punishment: v }));

      if (id === ID.limit) {
        return K.askModal(i, K.modal(`an_limit_${msg.id}_${Date.now()}`, 'Limit',
          K.labelText('Actions allowed', 'count', { value: S.row?.threshold ?? 3, min: 1, max: 2, required: true, description: 'Punish when a member reaches this many (1-20)' }),
          K.labelText('Within seconds', 'secs', { value: S.row?.timeframe ?? 60, min: 1, max: 3, required: true, description: 'Time window (5-600)' }),
        ), (d, e) => render(d, e), async (sub) => {
          const n = Number(K.readText(sub, 'count')); const s = Number(K.readText(sub, 'secs'));
          if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error('Actions must be a number from 1 to 20');
          if (!Number.isInteger(s) || s < 5 || s > 600) throw new Error('Seconds must be a number from 5 to 600');
          await save(guild.id, { threshold: n, timeframe: s });
          await refresh();
        });
      }

      if (id === ID.trustAdd) {
        return go(i, async () => {
          for (const uid of i.values) {
            if (uid === guild.ownerId) continue;
            await AntinukeWhitelist.findOrCreate({ where: { guildId: guild.id, userId: uid }, defaults: { guildId: guild.id, userId: uid, addedBy: user.id } });
          }
          events().bust(guild.id);
        });
      }
      if (id === ID.trustRem) {
        return go(i, async () => { await AntinukeWhitelist.destroy({ where: { guildId: guild.id, userId: v } }); events().bust(guild.id); });
      }

      if (id === ID.ownerAdd || id === ID.adminAdd) {
        const key = id === ID.ownerAdd ? 'extraOwners' : 'admins';
        const cap = id === ID.ownerAdd ? 5 : 10;
        return go(i, async () => {
          const cur = S.ai[key];
          const add = [...i.users.values()].filter(u => !u.bot && u.id !== guild.ownerId && !S.ai.extraOwners.includes(u.id) && !S.ai.admins.includes(u.id)).map(u => u.id);
          if (!add.length) throw new Error('Those members already have access, or are bots');
          if (cur.length + add.length > cap) throw new Error(`Limit is ${cap}`);
          await GuardSettings.write(guild.id, 'antinuke', { [key]: [...cur, ...add] });
        });
      }
      if (id === ID.accessRem) {
        return go(i, async () => {
          const [kind, who] = v.split(':');
          const key = kind === 'extra' ? 'extraOwners' : 'admins';
          await GuardSettings.write(guild.id, 'antinuke', { [key]: S.ai[key].filter(u => u !== who) });
        });
      }

      if (id === ID.aiToggle) return go(i, () => GuardSettings.write(guild.id, 'antinuke', { ai: !S.ai.ai }));
      if (id === ID.aiLevel) return go(i, () => GuardSettings.write(guild.id, 'antinuke', { level: v }));

      if (id === ID.logSel) return go(i, () => save(guild.id, { logChannelId: i.values[0] }));
      if (id === ID.logClear) return go(i, () => save(guild.id, { logChannelId: null }));
      if (id === ID.logTest) {
        return go(i, async () => {
          const ok = await events().sendTest(guild, S.row, user);
          if (!ok) throw new Error('I cannot post in that channel');
        });
      }
    },
  });
  return msg;
}

module.exports = { open, accessOf, scan, scanEmbed, PROTECTIONS, KEYS, PRESETS };
