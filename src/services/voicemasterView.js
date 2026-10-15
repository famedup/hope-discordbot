/* ---
   author : cashholy (carti)
   module : voicemasterView
   --- */

// hope — voicemaster views.
//
// Every card here is built from the shared UI kit (services/ui.js), so it matches the
// rest of the bot. Three surfaces:
//
//   panel()      the public card in the control channel. Two buttons, nothing else.
//   dashboard()  a private, live card for ONE room. It shows the room's real state
//                (locked / hidden / limit / who is inside) and every control edits
//                that same message in place, so you never scroll through replies.
//   setup()      one-screen setup: three channel pickers + save, or build it all.

const { ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const ui = require('./ui');
const emojis = require('../media/emojis.json');

/** All custom ids. Keep them free of "_back_" (interactionCreate treats that as roleplay). */
const ID = Object.freeze({
  manage: 'vm_manage', claim: 'vm_claim',
  lock: 'vm_lock', hide: 'vm_hide', rename: 'vm_rename', dec: 'vm_dec', inc: 'vm_inc', limit: 'vm_limit', kick: 'vm_kick',
  modal: 'vm_rename_modal',
  setupText: 'vm_setup_text', setupVoice: 'vm_setup_voice', setupCategory: 'vm_setup_category',
  save: 'vm_setup_save', auto: 'vm_setup_auto', cancel: 'vm_setup_cancel', repost: 'vm_repost',
});

const MAX_LIMIT = 99;

/* ── room state, read straight from the channel ─────────────────────── */

const everyoneOverwrite = (vc) => vc.permissionOverwrites.cache.get(vc.guild.id);
const isLocked = (vc) => Boolean(everyoneOverwrite(vc)?.deny.has('Connect'));
const isHidden = (vc) => Boolean(everyoneOverwrite(vc)?.deny.has('ViewChannel'));

/* ── public panel ───────────────────────────────────────────────────── */

function panel({ triggerId }) {
  return ui.box()
    .addTextDisplayComponents(ui.text(`## voicemaster\n${ui.sub(`Join <#${triggerId}> and the room is yours.`)}`))
    .addSeparatorComponents(ui.sep(false))
    .addActionRowComponents(ui.row(
      ui.btn(ID.manage, 'Manage room', { style: 'primary' }),
      ui.btn(ID.claim, 'Claim', { emoji: emojis.j2c_claim }),
    ))
    .addTextDisplayComponents(ui.text(ui.sub('Lock · hide · limit · rename · remove, all in one place')));
}

/* ── private dashboard ──────────────────────────────────────────────── */

/**
 * @param vc        the voice channel
 * @param ownerId   who owns it (never listed in the "remove" menu)
 * @param note      small line shown under the state, e.g. "Locked the room"
 * @param gone      member ids that were just removed (the cache can lag a moment)
 */
function dashboard(vc, { ownerId, note, gone = [] } = {}) {
  const locked = isLocked(vc);
  const hidden = isHidden(vc);
  const limit = vc.userLimit || 0;
  const inside = [...vc.members.values()].filter(m => !gone.includes(m.id));
  const others = inside.filter(m => m.id !== ownerId);

  const c = ui.box();
  c.addTextDisplayComponents(ui.text(`## ${vc.name}`));
  c.addTextDisplayComponents(ui.text(ui.sub(
    `${inside.length} in room · ${limit ? `limit ${limit}` : 'no limit'} · ${Math.round(vc.bitrate / 1000)} kbps`)));
  c.addSeparatorComponents(ui.sep(false));
  c.addTextDisplayComponents(ui.text(
    `**${locked ? 'Locked' : 'Open'}** · **${hidden ? 'Hidden' : 'Visible'}**` + (note ? `\n${ui.sub(note)}` : '')));

  c.addActionRowComponents(ui.row(
    ui.btn(ID.lock, locked ? 'Unlock' : 'Lock', { emoji: locked ? emojis.j2c_unlock : emojis.j2c_lock }),
    ui.btn(ID.hide, hidden ? 'Reveal' : 'Hide', { emoji: hidden ? emojis.j2c_unhide : emojis.j2c_hide }),
    ui.btn(ID.rename, 'Rename'),
  ));
  c.addActionRowComponents(ui.row(
    ui.btn(ID.dec, '−', { disabled: limit === 0 }),
    ui.btn(ID.limit, limit ? String(limit) : '∞', { disabled: true }),
    ui.btn(ID.inc, '+', { disabled: limit >= MAX_LIMIT }),
  ));
  if (others.length) {
    c.addActionRowComponents(ui.row(ui.select(
      ID.kick, 'Remove someone from the room…',
      others.slice(0, 25).map(m => ({ label: m.displayName, value: m.id })),
    )));
  }
  return c;
}

/* ── setup ──────────────────────────────────────────────────────────── */

const pickerRow = (id, placeholder, type, current) => {
  const menu = new ChannelSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).setChannelTypes(type);
  if (current) menu.setDefaultChannels(current);
  return ui.row(menu);
};

function setup({ picks = {} } = {}) {
  const at = (id) => (id ? `<#${id}>` : '`not set`');
  const ready = Boolean(picks.text && picks.voice && picks.category);

  return ui.box()
    .addTextDisplayComponents(ui.text([
      '## voicemaster setup',
      ui.sub('Pick three channels, or let me build everything.'),
      '',
      `**Panel** · ${at(picks.text)}`,
      `**Trigger** · ${at(picks.voice)}`,
      `**Category** · ${at(picks.category)}`,
    ].join('\n')))
    .addActionRowComponents(pickerRow(ID.setupText, 'Panel channel (text)', ChannelType.GuildText, picks.text))
    .addActionRowComponents(pickerRow(ID.setupVoice, 'Trigger channel (voice)', ChannelType.GuildVoice, picks.voice))
    .addActionRowComponents(pickerRow(ID.setupCategory, 'Category for rooms', ChannelType.GuildCategory, picks.category))
    .addActionRowComponents(ui.row(
      ui.btn(ID.save, 'Save', { style: 'primary', disabled: !ready }),
      ui.btn(ID.auto, 'Build it for me'),
      ui.btn(ID.cancel, 'Cancel'),
    ));
}

function live({ text, voice, category, note }) {
  return ui.box('success').addTextDisplayComponents(ui.text([
    '## voicemaster is live',
    ui.sub(`Join <#${voice}> to try it.`),
    '',
    `**Panel** · <#${text}>`,
    `**Trigger** · <#${voice}>`,
    `**Category** · <#${category}>`,
    ...(note ? ['', ui.sub(note)] : []),
  ].join('\n')));
}

function config({ cfg, guild, rooms }) {
  const at = (id) => (guild.channels.cache.has(id) ? `<#${id}>` : '`deleted`');
  return ui.box()
    .addTextDisplayComponents(ui.text([
      '## voicemaster',
      ui.sub(`${rooms} active ${rooms === 1 ? 'room' : 'rooms'}`),
      '',
      `**Panel** · ${at(cfg.textChannelId)}`,
      `**Trigger** · ${at(cfg.voiceChannelId)}`,
      `**Category** · ${at(cfg.categoryId)}`,
    ].join('\n')))
    .addActionRowComponents(ui.row(ui.btn(ID.repost, 'Repost panel')));
}

module.exports = { ID, MAX_LIMIT, isLocked, isHidden, panel, dashboard, setup, live, config };
