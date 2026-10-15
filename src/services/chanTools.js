// ▛▀ cashholy (carti) ▀▜

// hope — channel tools: lock, unlock, hide, unhide, lockthread, unlockthread,
// hidethread, unhidethread, clone, nuke.  One spec table, one `define()`.
//
// Design notes (these are the fixes over the old lock/hide behaviour):
//  - Un-doing a lock/hide sets the overwrite back to NEUTRAL (null), never to
//    "allow". Setting `true` punches through category/role rules.
//  - Before denying @everyone the bot gives itself an explicit allow, so it
//    never loses the channel it just changed (and can undo it later).
//  - Already locked / hidden is detected and reported instead of re-applying.
//  - Slash and prefix share one code path; thread actions only accept threads.

const {
  PermissionFlagsBits: P, ChannelType: T, ComponentType, MessageFlags, SlashCommandBuilder,
} = require('discord.js');
const ui = require('./ui');

const NO_PING = { parse: [] };
const THREAD_TYPES = [T.PublicThread, T.PrivateThread, T.AnnouncementThread];
const isThread = (c) => THREAD_TYPES.includes(c?.type);
const VOICY = [T.GuildVoice, T.GuildStageVoice];
const CLONEABLE = [T.GuildText, T.GuildAnnouncement, T.GuildForum, T.GuildMedia, T.GuildVoice, T.GuildStageVoice, T.GuildCategory];
const NUKEABLE = CLONEABLE.filter(t => t !== T.GuildCategory);

/* ── specs ─────────────────────────────────────────────────────────── */

const ACTIONS = {
  lock:         { desc: 'Stop everyone from talking in a channel',   perm: P.ManageChannels, aliases: [] },
  unlock:       { desc: 'Let everyone talk in a channel again',      perm: P.ManageChannels, aliases: [] },
  hide:         { desc: 'Hide a channel from everyone',              perm: P.ManageChannels, aliases: [] },
  unhide:       { desc: 'Show a hidden channel again',               perm: P.ManageChannels, aliases: [] },
  lockthread:   { desc: 'Lock a thread so only mods can post',       perm: P.ManageThreads,  aliases: ['lt'],  thread: true },
  unlockthread: { desc: 'Unlock a thread',                           perm: P.ManageThreads,  aliases: ['ult'], thread: true },
  hidethread:   { desc: 'Archive and lock a thread to hide it',      perm: P.ManageThreads,  aliases: ['ht'],  thread: true },
  unhidethread: { desc: 'Bring a hidden thread back',                perm: P.ManageThreads,  aliases: ['uht'], thread: true },
  clone:        { desc: 'Make a copy of a channel',                  perm: P.ManageChannels, aliases: [] },
  nuke:         { desc: 'Wipe a channel by recreating it (asks first)', perm: P.ManageChannels, aliases: [] },
};

const PERM_LABEL = { [P.ManageChannels]: 'Manage Channels', [P.ManageThreads]: 'Manage Threads' };

/* ── small helpers ─────────────────────────────────────────────────── */

const actorOf = (ctx) => ctx.user ?? ctx.author;

function lockKeys(ch) {
  if (VOICY.includes(ch.type)) return ['Connect'];
  if (ch.type === T.GuildCategory) return ['SendMessages', 'SendMessagesInThreads', 'Connect'];
  if (ch.type === T.GuildForum || ch.type === T.GuildMedia) return ['SendMessages', 'SendMessagesInThreads'];
  return ['SendMessages', 'SendMessagesInThreads', 'CreatePublicThreads', 'CreatePrivateThreads'];
}

const patchOf = (keys, value) => Object.fromEntries(keys.map(k => [k, value]));

function everyoneDenies(ch, key) {
  const ow = ch.permissionOverwrites.cache.get(ch.guild.roles.everyone.id);
  return !!ow?.deny.has(P[key]);
}

function auditReason(ctx, reason) {
  const base = reason ? `${reason} | ` : '';
  return `${base}by ${actorOf(ctx).tag ?? actorOf(ctx).username}`.slice(0, 500);
}

function card({ kind = 'base', title, line, note, undo = false }) {
  const c = ui.box(kind).addTextDisplayComponents(ui.text(`## ${title}`), ui.text(line));
  if (note) c.addTextDisplayComponents(ui.text(`-# ${note}`));
  if (undo) c.addSeparatorComponents(ui.sep()).addActionRowComponents(ui.row(ui.btn('chan_undo', 'Undo')));
  return c;
}

/** Send a result card with an optional 60s Undo button for the invoker. */
async function reply(ctx, { kind, title, line, note, undo }) {
  const msg = await ui.send(ctx, card({ kind, title, line, note, undo: !!undo }), { extra: { allowedMentions: NO_PING } });
  if (!undo || typeof msg?.createMessageComponentCollector !== 'function') return msg;

  const col = msg.createMessageComponentCollector({
    componentType: ComponentType.Button, time: 60_000, filter: ui.onlyUser(actorOf(ctx).id),
  });
  col.on('collect', async (i) => {
    try {
      await undo.run();
      col.stop('done');
      await i.update({ components: [card({ kind: 'success', title: undo.title, line: undo.line })] });
    } catch (e) {
      await i.reply({ components: [ui.fail(explain(e))], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral }).catch(() => {});
    }
  });
  col.on('end', (_, why) => {
    if (why === 'done') return;
    msg.edit({ components: [card({ kind, title, line, note })], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  });
  return msg;
}

function explain(e) {
  if (e?.code === 50013) return 'I\'m missing permissions for that. I need Manage Channels, Manage Roles and the permission I\'m changing.';
  if (e?.code === 30013 || e?.code === 30005) return 'This server has hit a channel limit.';
  if (e?.code === 50074) return 'Discord won\'t let me delete a Community channel (rules / updates). Change it in Server Settings → Community first.';
  if (e?.code === 10003) return 'That channel no longer exists.';
  return 'Something went wrong. Please try again.';
}

/* ── target parsing ────────────────────────────────────────────────── */

async function lookup(guild, raw) {
  const id = raw.match(/^<#(\d{17,20})>$/)?.[1] ?? raw.match(/^\d{17,20}$/)?.[0];
  if (id) return guild.channels.cache.get(id) ?? await guild.channels.fetch(id).catch(() => null);
  if (!raw.startsWith('#')) return null; // bare words are the reason, not a channel name
  const name = raw.slice(1).toLowerCase();
  return guild.channels.cache.find(c => c.name?.toLowerCase() === name && !isThread(c)) ?? null;
}

async function target(ctx, args, a, slash) {
  if (slash) {
    const opt = ctx.options.getChannel(a.thread ? 'thread' : 'channel');
    const ch = opt ? (ctx.guild.channels.cache.get(opt.id) ?? await ctx.guild.channels.fetch(opt.id).catch(() => null)) : ctx.channel;
    return { channel: ch, text: ctx.options.getString(a.kind === 'clone' ? 'name' : 'reason') };
  }
  let channel = ctx.channel; let rest = args;
  if (args[0]) {
    const found = await lookup(ctx.guild, args[0]);
    if (found) { channel = found; rest = args.slice(1); }
  }
  return { channel, text: rest.join(' ').trim() || null };
}

/* ── actions ───────────────────────────────────────────────────────── */

async function setLock(ch, on, reason) {
  const keys = lockKeys(ch);
  const me = ch.guild.members.me;
  // bot first, so it can never lock itself out mid-change
  if (!me.permissions.has(P.Administrator)) {
    const own = keys.filter(k => k === 'SendMessages' || k === 'Connect');
    await ch.permissionOverwrites.edit(me, patchOf(own, on ? true : null), { reason });
  }
  await ch.permissionOverwrites.edit(ch.guild.roles.everyone, patchOf(keys, on ? false : null), { reason });
}

async function setHidden(ch, on, reason) {
  const me = ch.guild.members.me;
  if (on && !me.permissions.has(P.Administrator)) {
    await ch.permissionOverwrites.edit(me, { ViewChannel: true }, { reason });
  }
  await ch.permissionOverwrites.edit(ch.guild.roles.everyone, { ViewChannel: on ? false : null }, { reason });
  if (!on && !me.permissions.has(P.Administrator)) {
    await ch.permissionOverwrites.edit(me, { ViewChannel: null }, { reason }).catch(() => {});
  }
}

async function doChannel(ctx, kind, ch, text) {
  const reason = auditReason(ctx, text);
  const by = `by ${actorOf(ctx).username}`;
  const note = text ? `${text} · ${by}` : by;
  const key = lockKeys(ch)[0];

  if (kind === 'lock') {
    if (everyoneDenies(ch, key)) return ui.send(ctx, ui.warn(`${ch} is already locked`), { extra: { allowedMentions: NO_PING } });
    await setLock(ch, true, reason);
    return reply(ctx, { kind: 'warning', title: 'Channel locked', line: `${ch} is locked for everyone.`, note,
      undo: { title: 'Channel unlocked', line: `${ch} is open again.`, run: () => setLock(ch, false, reason) } });
  }
  if (kind === 'unlock') {
    if (!everyoneDenies(ch, key)) return ui.send(ctx, ui.warn(`${ch} isn't locked`), { extra: { allowedMentions: NO_PING } });
    await setLock(ch, false, reason);
    return reply(ctx, { kind: 'success', title: 'Channel unlocked', line: `${ch} is open again.`, note,
      undo: { title: 'Channel locked', line: `${ch} is locked for everyone.`, run: () => setLock(ch, true, reason) } });
  }
  if (kind === 'hide') {
    if (everyoneDenies(ch, 'ViewChannel')) return ui.send(ctx, ui.warn(`${ch} is already hidden`), { extra: { allowedMentions: NO_PING } });
    await setHidden(ch, true, reason);
    return reply(ctx, { kind: 'warning', title: 'Channel hidden', line: `${ch} is now hidden from everyone.`, note,
      undo: { title: 'Channel visible', line: `${ch} is visible again.`, run: () => setHidden(ch, false, reason) } });
  }
  // unhide
  if (!everyoneDenies(ch, 'ViewChannel')) return ui.send(ctx, ui.warn(`${ch} isn't hidden`), { extra: { allowedMentions: NO_PING } });
  await setHidden(ch, false, reason);
  return reply(ctx, { kind: 'success', title: 'Channel visible', line: `${ch} is visible again.`, note,
    undo: { title: 'Channel hidden', line: `${ch} is hidden from everyone.`, run: () => setHidden(ch, true, reason) } });
}

async function doThread(ctx, kind, th, text) {
  const reason = auditReason(ctx, text);
  const by = `by ${actorOf(ctx).username}`;
  const note = text ? `${text} · ${by}` : by;
  const warnOnly = (m) => ui.send(ctx, ui.warn(m), { extra: { allowedMentions: NO_PING } });

  if (kind === 'lockthread') {
    if (th.locked) return warnOnly(`${th} is already locked`);
    await th.setLocked(true, reason);
    return reply(ctx, { kind: 'warning', title: 'Thread locked', line: `${th} is locked. Only mods can post.`, note,
      undo: { title: 'Thread unlocked', line: `${th} is open again.`, run: () => th.setLocked(false, reason) } });
  }
  if (kind === 'unlockthread') {
    if (!th.locked) return warnOnly(`${th} isn't locked`);
    await th.setLocked(false, reason);
    return reply(ctx, { kind: 'success', title: 'Thread unlocked', line: `${th} is open again.`, note,
      undo: { title: 'Thread locked', line: `${th} is locked.`, run: () => th.setLocked(true, reason) } });
  }
  if (kind === 'hidethread') {
    if (th.archived && th.locked) return warnOnly(`${th} is already hidden`);
    await th.edit({ locked: true, archived: true, reason });
    return reply(ctx, { kind: 'warning', title: 'Thread hidden', line: `${th} is archived and locked.`, note,
      undo: { title: 'Thread restored', line: `${th} is back.`, run: () => th.edit({ archived: false, locked: false, reason }) } });
  }
  // unhidethread
  if (!th.archived && !th.locked) return warnOnly(`${th} isn't hidden`);
  await th.edit({ archived: false, locked: false, reason });
  return reply(ctx, { kind: 'success', title: 'Thread restored', line: `${th} is back.`, note,
    undo: { title: 'Thread hidden', line: `${th} is archived and locked.`, run: () => th.edit({ locked: true, archived: true, reason }) } });
}

async function placeLike(src, fresh, below) {
  const pos = src.rawPosition ?? src.position ?? 0;
  await fresh.setPosition(below ? pos + 1 : pos).catch(() => {});
}

async function doClone(ctx, ch, name) {
  if (!CLONEABLE.includes(ch.type)) return ui.say.error(ctx, 'That channel can\'t be cloned');
  const cleaned = name ? name.toLowerCase().replace(/\s+/g, '-').slice(0, 100) : ch.name;
  const fresh = await ch.clone({ name: cleaned, reason: auditReason(ctx, 'clone') });
  await placeLike(ch, fresh, true);
  const url = `https://discord.com/channels/${ctx.guild.id}/${fresh.id}`;
  const c = card({ kind: 'success', title: 'Channel cloned', line: `${ch} → ${fresh}`, note: `by ${actorOf(ctx).username}` })
    .addSeparatorComponents(ui.sep())
    .addActionRowComponents(ui.row(ui.link('Open', url)));
  return ui.send(ctx, c, { extra: { allowedMentions: NO_PING } });
}

async function doNuke(ctx, ch, text) {
  const g = ctx.guild;
  if (!NUKEABLE.includes(ch.type)) return ui.say.error(ctx, ch.type === T.GuildCategory ? 'Categories can\'t be nuked' : 'That channel can\'t be nuked');
  if ([g.rulesChannelId, g.publicUpdatesChannelId, g.safetyAlertsChannelId].includes(ch.id)) {
    return ui.say.error(ctx, 'That\'s a Community channel (rules / updates). Change it in Server Settings → Community first');
  }

  const ask = ui.box('error').addTextDisplayComponents(
    ui.text('## Nuke this channel?'),
    ui.text(`${ch} will be recreated with the same name, permissions, topic and slowmode, and the original is deleted.`),
    ui.text('-# All messages, pins, threads, webhooks and invites in it are lost. This can\'t be undone.'),
  ).addSeparatorComponents(ui.sep()).addActionRowComponents(
    ui.row(ui.btn('nuke_yes', 'Nuke', { style: 'danger' }), ui.btn('nuke_no', 'Cancel')),
  );
  const msg = await ui.send(ctx, ask, { extra: { allowedMentions: NO_PING } });
  if (typeof msg?.createMessageComponentCollector !== 'function') return msg;

  const col = msg.createMessageComponentCollector({
    componentType: ComponentType.Button, time: 30_000, max: 1, filter: ui.onlyUser(actorOf(ctx).id),
  });
  let answered = false;
  col.on('collect', async (i) => {
    answered = true;
    if (i.customId === 'nuke_no') {
      return i.update({ components: [card({ title: 'Nuke cancelled', line: `${ch} was left alone.` })] }).catch(() => {});
    }
    try {
      await i.update({ components: [card({ kind: 'warning', title: 'Nuking…', line: `Recreating ${ch}` })] });
      const reason = auditReason(ctx, text ?? 'nuke');
      const fresh = await ch.clone({ name: ch.name, reason });
      await placeLike(ch, fresh, false);
      if (g.systemChannelId === ch.id) await g.setSystemChannel(fresh, reason).catch(() => {});
      if (g.afkChannelId === ch.id) await g.setAFKChannel(fresh, reason).catch(() => {});
      await ch.delete(reason);
      if (fresh.isTextBased?.()) {
        await fresh.send({
          components: [card({ kind: 'success', title: 'Channel nuked', line: 'This channel has been reset.', note: `by ${actorOf(ctx).username}${text ? ` · ${text}` : ''}` })],
          flags: MessageFlags.IsComponentsV2, allowedMentions: NO_PING,
        }).catch(() => {});
      }
      // the prompt only survives if it lived in another channel
      await msg.edit({ components: [card({ kind: 'success', title: 'Channel nuked', line: `${fresh} is fresh and ready.` })], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    } catch (e) {
      await msg.edit({ components: [ui.fail(explain(e))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
  });
  col.on('end', () => {
    if (answered) return;
    msg.edit({ components: [card({ title: 'Nuke timed out', line: `${ch} was left alone.` })], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  });
  return msg;
}

/* ── command factory ───────────────────────────────────────────────── */

function define(kind) {
  const a = { ...ACTIONS[kind], kind };
  const data = new SlashCommandBuilder().setName(kind).setDescription(a.desc).setDefaultMemberPermissions(a.perm);
  if (a.thread) {
    data.addChannelOption(o => o.setName('thread').setDescription('Thread (defaults to this one)').addChannelTypes(...THREAD_TYPES));
  } else {
    data.addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to this one)'));
  }
  if (kind === 'clone') data.addStringOption(o => o.setName('name').setDescription('Name for the copy').setMaxLength(100));
  else data.addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(300));

  return {
    data,
    name: kind,
    description: a.desc,
    aliases: a.aliases,
    category: 'moderation',

    async execute(ctx, args = []) {
      const slash = ctx.isChatInputCommand?.();
      if (!ctx.guild) return ui.say.error(ctx, 'Use this in a server');

      const { channel, text } = await target(ctx, args, a, slash);
      if (!channel) return ui.say.error(ctx, 'I couldn\'t find that channel');

      if (a.thread && !isThread(channel)) {
        return ui.say.error(ctx, `That isn't a thread. Run \`${kind}\` inside one, or give me one.`);
      }
      if (!a.thread && isThread(channel)) {
        return ui.say.error(ctx, kind === 'clone' || kind === 'nuke'
          ? 'Threads can\'t be cloned or nuked'
          : `That's a thread. Use \`${kind}thread\` instead.`);
      }

      const me = ctx.guild.members.me;
      const label = PERM_LABEL[a.perm];
      if (!channel.permissionsFor(ctx.member)?.has(a.perm)) return ui.say.error(ctx, `You need **${label}** for that`);
      if (!me.permissions.has(a.perm)) return ui.say.error(ctx, `I need **${label}**`);

      try {
        if (a.thread) return await doThread(ctx, kind, channel, text);
        if (kind === 'clone') return await doClone(ctx, channel, text);
        if (kind === 'nuke') return await doNuke(ctx, channel, text);
        return await doChannel(ctx, kind, channel, text);
      } catch (e) {
        if (process.env.CHAN_DEBUG) console.error(e);
        return ui.say.error(ctx, explain(e));
      }
    },
  };
}

module.exports = { define, ACTIONS, setLock, setHidden };
