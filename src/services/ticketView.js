/* ⌁ crafted by cashholy (carti) ⌁ */

// hope — ticket UI.
//
//   setupCard      the one-screen basics: panel channel, support role(s), category
//   advancedCard   tabbed editor (Overview · Appearance · Access · Automation · Messages)
//   optionsCard    manage ticket types
//   panelMessage   the public panel (saved embed + buttons, or a built-in card)
//   MODALS         every "Edit" row opens one of these; built as raw Discord JSON so
//                  they can use the newer modal components (Label, selects, radio
//                  groups, checkboxes) without depending on builder method names
//
// Custom ids: tk:<area>:<action>:<panelId>[:<extra>]  (panel id travels inside the
// id, so nothing depends on in-memory state and everything survives a restart).

const {
  ChannelType, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, SectionBuilder, TextDisplayBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags,
} = require('discord.js');
const ui = require('./ui');
const emojis = require('../media/emojis.json');
const store = require('./ticketStore');
const { findEmbed } = require('./embedSend');
const { renderEmbed } = require('./embedRender');
const { applyVars } = require('./embedVars');

const V2 = MessageFlags.IsComponentsV2;
const id = (...parts) => ['tk', ...parts].join(':');

/* ── tiny formatters ────────────────────────────────────────────────── */

const chan = (guild, cid) => (cid ? (guild.channels.cache.has(cid) ? `<#${cid}>` : '`deleted channel`') : null);
const rolesText = (ids) => (ids?.length ? ids.map(r => `<@&${r}>`).join(' ') : null);
const onOff = (b) => (b ? 'on' : 'off');
const preview = (t, n = 70) => {
  if (!t) return null;
  const one = String(t).replace(/\s+/g, ' ').replace(/`/g, "'").trim();
  return one.length > n ? `${one.slice(0, n - 1)}…` : one;
};
const STYLE_NAME = { primary: 'Blurple', secondary: 'Grey', success: 'Green', danger: 'Red' };
const LAYOUT_NAME = { auto: 'Auto', buttons: 'Buttons', dropdown: 'Dropdown' };
const ASSIGN_NAME = { off: null, random: 'Random', least: 'Least busy' };

/* ── setup (basics) ─────────────────────────────────────────────────── */

const hasKey = (o, k) => Boolean(o) && Object.prototype.hasOwnProperty.call(o, k);

/** The values shown on the basics card: unsaved picks win over what is saved. */
function effective(panel) {
  const s = store.settingsOf(panel);
  const d = s.draft || {};
  return {
    s,
    channelId: hasKey(d, 'panelChannelId') ? d.panelChannelId : panel.panelChannelId,
    roleIds: hasKey(d, 'supportRoleIds') ? d.supportRoleIds : s.supportRoleIds,
    categoryId: hasKey(d, 'categoryId') ? d.categoryId : s.categoryId,
    dirty: Object.keys(d).length > 0,
  };
}

function setupCard(panel, guild, { note } = {}) {
  const { channelId, roleIds, categoryId, dirty } = effective(panel);
  const ready = Boolean(channelId && roleIds.length);
  const posted = Boolean(panel.panelMessageId);

  const mark = (done, label, value) => `${done ? ui.ICON.success : '○'} ${label}${value ? ` · ${value}` : ''}`;
  const lines = [
    mark(Boolean(channelId), 'Where the panel is posted', chan(guild, channelId)),
    mark(roleIds.length > 0, 'Who can see and answer tickets', rolesText(roleIds)),
    mark(Boolean(categoryId), 'Where ticket channels are created — optional', chan(guild, categoryId)),
  ];

  const channelMenu = new ChannelSelectMenuBuilder().setCustomId(id('s', 'ch', panel.id))
    .setPlaceholder('Choose the panel channel')
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
  if (channelId && guild.channels.cache.has(channelId)) channelMenu.setDefaultChannels(channelId);

  const roleMenu = new RoleSelectMenuBuilder().setCustomId(id('s', 'ro', panel.id))
    .setPlaceholder('Choose your support role').setMinValues(1).setMaxValues(5);
  const liveRoles = roleIds.filter(r => guild.roles.cache.has(r));
  if (liveRoles.length) roleMenu.setDefaultRoles(...liveRoles);

  const categoryMenu = new ChannelSelectMenuBuilder().setCustomId(id('s', 'ca', panel.id))
    .setPlaceholder('Choose a category (optional)').setChannelTypes(ChannelType.GuildCategory).setMinValues(0).setMaxValues(1);
  if (categoryId && guild.channels.cache.has(categoryId)) categoryMenu.setDefaultChannels(categoryId);

  return ui.box()
    .addTextDisplayComponents(ui.text([
      `## Ticket setup — ${panel.name}`,
      ui.sub(`These are the basics for your ${posted ? 'existing' : 'new'} panel. Changing one only touches that setting — everything you set up in Advanced stays as it is.`),
      ...(note ? ['', note] : []),
      '',
      ...lines,
    ].join('\n')))
    .addSeparatorComponents(ui.sep())
    .addActionRowComponents(ui.row(channelMenu))
    .addActionRowComponents(ui.row(roleMenu))
    .addActionRowComponents(ui.row(categoryMenu))
    .addSeparatorComponents(ui.sep())
    .addActionRowComponents(ui.row(
      ui.btn(id('s', 'save', panel.id), 'Save changes', { style: 'success', emoji: ui.ICON.success, disabled: !(ready && (dirty || !posted)) }),
      ui.btn(id('s', 'adv', panel.id), 'Advanced', { emoji: emojis.rightArrow }),
    ));
}

function panelPicker(panels, { note } = {}) {
  return ui.box()
    .addTextDisplayComponents(ui.text(`## Ticket panels\n${ui.sub('Pick a panel to set up, or run `ticket setup <name>` to create a new one.')}${note ? `\n\n${note}` : ''}`))
    .addActionRowComponents(ui.row(ui.select(id('s', 'pick'), 'Choose a panel…',
      panels.slice(0, 25).map(p => ({ label: p.name, value: String(p.id), description: p.panelMessageId ? 'Published' : 'Not published yet' })))));
}

/* ── advanced editor ────────────────────────────────────────────────── */

const TABS = [['overview', 'Overview'], ['appearance', 'Appearance'], ['access', 'Access'], ['automation', 'Automation'], ['messages', 'Messages']];

function editRow(panelId, label, value, field, button = 'Edit') {
  return new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${label}**\n${value || 'Not set'}`))
    .setButtonAccessory(ui.btn(id('a', 'edit', panelId, field), button, { emoji: emojis.rightArrow }));
}

function tabRows(tab, panel, guild) {
  const s = store.settingsOf(panel);
  const raw = panel.data || {};
  const P = panel.id;
  const dur = (ms) => (ms ? store.formatDuration(ms) : null);
  const preset = store.NAME_PRESETS.find(p => p.value === s.nameFormat);
  const msg = (t) => {
    if (!t) return null;
    const m = String(t).match(/\{embed:([a-z0-9_-]{1,16})\}/i);
    return m ? `Saved embed · \`${m[1]}\`` : preview(t);
  };

  switch (tab) {
    case 'appearance':
      return [
        editRow(P, 'Panel embed', s.embedName ? `Saved embed · \`${s.embedName}\`` : 'Built-in panel', 'embed'),
        editRow(P, 'Built-in panel', `${preview(s.title, 40)} · #${String(s.color).replace('#', '').toUpperCase()}${s.image ? ' · image' : ''}${s.thumbnail ? ' · thumbnail' : ''}`, 'paneltext'),
        editRow(P, 'Dropdown placeholder', raw.placeholder, 'placeholder'),
        editRow(P, 'Channel name format', preset ? preset.label : `\`${s.nameFormat}\``, 'nameformat'),
        editRow(P, 'Button label', raw.buttonLabel ? `${raw.buttonLabel} · ${STYLE_NAME[s.buttonStyle]} · ${LAYOUT_NAME[s.layout]}` : null, 'button'),
      ];
    case 'access':
      return [
        editRow(P, 'Support roles', rolesText(s.supportRoleIds), 'support'),
        editRow(P, 'Who can open tickets', rolesText(s.allowedRoleIds) || 'Everyone', 'allowed'),
        editRow(P, 'Blocked roles', rolesText(s.blockedRoleIds) || 'None', 'blocked'),
      ];
    case 'automation':
      return [
        editRow(P, 'Inactivity warning', dur(s.inactivityWarnMs), 'inactivity'),
        editRow(P, 'Auto-close after', dur(s.autoCloseMs), 'autoclose'),
        editRow(P, 'Auto-delete after', dur(s.autoDeleteMs), 'autodelete'),
        editRow(P, 'Ask for a rating', s.askRating ? 'On' : null, 'rating'),
        editRow(P, 'Cooldown between tickets', dur(s.cooldownMs), 'cooldown'),
        editRow(P, 'Auto-assign staff', ASSIGN_NAME[s.autoAssign], 'autoassign'),
      ];
    case 'messages':
      return [
        editRow(P, 'Greeting message', msg(raw.greeting), 'greeting'),
        editRow(P, 'Close message', msg(raw.closeMessage), 'closemsg'),
        editRow(P, 'Limit reached message', msg(raw.limitMessage), 'limitmsg'),
      ];
    default: // overview
      return [
        editRow(P, 'Panel & channels', [
          `Panel ${chan(guild, panel.panelChannelId) || '`not set`'} · Logs ${chan(guild, s.logChannelId) || '`not set`'}`,
          `Tickets in ${chan(guild, s.categoryId) || '`top of the server`'} · Closed to ${chan(guild, s.closedCategoryId) || '`stay in place`'}`,
        ].join('\n'), 'channels'),
        editRow(P, 'Behaviour',
          `Max ${s.maxOpen} open · Claims ${onOff(s.claims)} · Auto-pin ${onOff(s.autoPin)} · Ping staff ${onOff(s.pingStaff)} · Delete delay ${store.formatDuration(s.deleteDelayMs, 'instant')}`, 'behaviour'),
        editRow(P, 'Ticket types', s.options.length ? s.options.map(o => `${o.emoji ? `${o.emoji} ` : ''}${o.name}`).join(' · ') : 'None — members get a single Open ticket button', 'options', 'Manage'),
      ];
  }
}

function advancedCard(panel, guild, tab = 'overview', { note } = {}) {
  const posted = panel.panelMessageId && panel.panelChannelId
    ? `Published in ${chan(guild, panel.panelChannelId)}` : 'Not published yet';
  const c = ui.box()
    .addTextDisplayComponents(ui.text(`## ${panel.name}\n${ui.sub(`Pick a tab, then edit any row. ${posted}.`)}${note ? `\n\n${note}` : ''}`))
    .addSeparatorComponents(ui.sep())
    .addActionRowComponents(ui.row(TABS.map(([key, name]) =>
      ui.btn(id('a', 'tab', panel.id, key), name, { style: key === tab ? 'primary' : 'secondary' }))))
    .addSeparatorComponents(ui.sep());
  for (const row of tabRows(tab, panel, guild)) c.addSectionComponents(row);
  return c
    .addSeparatorComponents(ui.sep())
    .addActionRowComponents(ui.row(
      ui.btn(id('a', 'pub', panel.id, tab), 'Publish', { style: 'success', emoji: ui.ICON.success }),
      ui.btn(id('a', 'back', panel.id), 'Back', { emoji: emojis.leftArrow }),
    ));
}

function optionsCard(panel, guild, { note } = {}) {
  const s = store.settingsOf(panel);
  const c = ui.box()
    .addTextDisplayComponents(ui.text(`## Ticket types\n${ui.sub(`Members pick one when they open a ticket. Up to ${store.MAX_OPTIONS}.`)}${note ? `\n\n${note}` : ''}`))
    .addSeparatorComponents(ui.sep());
  if (!s.options.length) c.addTextDisplayComponents(ui.text('No types yet. Members get a single Open ticket button.'));
  for (const o of s.options) {
    c.addSectionComponents(new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `**${o.emoji ? `${o.emoji} ` : ''}${o.name}**\n${[o.description || 'No description', o.categoryId ? chan(guild, o.categoryId) : null].filter(Boolean).join(' · ')}`))
      .setButtonAccessory(ui.btn(id('a', 'optedit', panel.id, o.id), 'Edit', { emoji: emojis.rightArrow })));
  }
  return c
    .addSeparatorComponents(ui.sep())
    .addActionRowComponents(ui.row(
      ui.btn(id('a', 'optadd', panel.id), 'Add type', { style: 'primary', disabled: s.options.length >= store.MAX_OPTIONS }),
      ui.btn(id('a', 'tab', panel.id, 'overview'), 'Back', { emoji: emojis.leftArrow }),
    ));
}

/* ── the public panel ───────────────────────────────────────────────── */

/** Buttons or a dropdown, depending on the panel's types and layout. */
function openRows(panel, s) {
  const P = panel.id;
  const opts = s.options;
  if (opts.length <= 1) {
    const only = opts[0];
    return [ui.row(ui.btn(id('open', P, only ? only.id : '-'), s.buttonLabel, { style: s.buttonStyle, emoji: s.buttonEmoji || only?.emoji }))];
  }
  const asButtons = s.layout === 'buttons' || (s.layout === 'auto' && opts.length <= 3);
  if (asButtons) {
    const rows = [];
    for (let i = 0; i < opts.length; i += 5) {
      rows.push(ui.row(opts.slice(i, i + 5).map(o => ui.btn(id('open', P, o.id), o.name.slice(0, 80), { style: s.buttonStyle, emoji: o.emoji }))));
    }
    return rows.slice(0, 2);
  }
  return [ui.row(ui.select(id('menu', P), s.placeholder, opts.map(o => ({ label: o.name, value: o.id, description: o.description, emoji: o.emoji }))))];
}

/**
 * The message posted in the panel channel.
 *  - a saved embed (any text can use variables) with the open controls underneath, or
 *  - the built-in Components V2 card.
 */
async function panelMessage(panel, guild) {
  const s = store.settingsOf(panel);
  const rows = openRows(panel, s);
  const ctx = { guild, vars: store.ticketVars({ panel }) };

  if (s.embedName) {
    const saved = await findEmbed(guild.id, s.embedName);
    const rendered = saved ? renderEmbed(saved, ctx) : null;
    if (rendered) {
      const own = (rendered.components || []).slice(0, Math.max(0, 5 - rows.length));
      return { embeds: rendered.embeds, ...(rendered.content ? { content: rendered.content } : {}), components: [...own, ...rows], allowedMentions: { parse: [] } };
    }
  }

  const v = (t) => applyVars(t ?? '', ctx);
  const card = ui.box().setAccentColor(store.hexToInt(s.color));
  const head = `## ${v(s.title)}\n${v(s.description)}`;
  card.addTextDisplayComponents(ui.text(head));
  if (s.image) card.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(s.image)));
  card.addSeparatorComponents(ui.sep(false));
  for (const r of rows) card.addActionRowComponents(r);
  return { components: [card], flags: V2, allowedMentions: { parse: [] } };
}

/* ── modals (raw JSON) ──────────────────────────────────────────────── */

const label = (text, description, component) => ({
  type: 18, label: String(text).slice(0, 45), ...(description ? { description: String(description).slice(0, 100) } : {}), component,
});
const textInput = (cid, { value, placeholder, required = true, paragraph = false, min, max } = {}) => ({
  type: 4, custom_id: cid, style: paragraph ? 2 : 1, required,
  ...(value ? { value: String(value).slice(0, 4000) } : {}),
  ...(placeholder ? { placeholder: String(placeholder).slice(0, 100) } : {}),
  ...(min != null ? { min_length: min } : {}), ...(max != null ? { max_length: max } : {}),
});
const stringSelect = (cid, options, { placeholder, required = true } = {}) => ({
  type: 3, custom_id: cid, required, ...(required ? {} : { min_values: 0 }),
  ...(placeholder ? { placeholder } : {}), options,
});
const roleSelect = (cid, { defaults = [], min = 0, max = 5, required = false, placeholder } = {}) => ({
  type: 6, custom_id: cid, min_values: required ? Math.max(1, min) : 0, max_values: max, required,
  ...(placeholder ? { placeholder } : {}),
  ...(defaults.length ? { default_values: defaults.slice(0, max).map(d => ({ id: d, type: 'role' })) } : {}),
});
const channelSelect = (cid, types, { defaultId, required = false, placeholder } = {}) => ({
  type: 8, custom_id: cid, channel_types: types, min_values: required ? 1 : 0, max_values: 1, required,
  ...(placeholder ? { placeholder } : {}),
  ...(defaultId ? { default_values: [{ id: defaultId, type: 'channel' }] } : {}),
});
const radio = (cid, options, value) => ({
  type: 21, custom_id: cid, required: true,
  options: options.map(([v, l, d]) => ({ value: v, label: l, ...(d ? { description: d } : {}), ...(v === value ? { default: true } : {}) })),
});
const checkbox = (cid, checked) => ({ type: 23, custom_id: cid, default: Boolean(checked) });

/** Read one component from a submitted modal, whatever its type. */
function read(i, cid) {
  const f = i.fields?.fields?.get?.(cid);
  return f ?? null;
}
const readText = (i, cid) => String(read(i, cid)?.value ?? '').trim();
const readValues = (i, cid) => read(i, cid)?.values ?? [];
const readChecked = (i, cid) => read(i, cid)?.value === true;
const readRadio = (i, cid) => read(i, cid)?.value ?? null;

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const CATEGORY = [ChannelType.GuildCategory];
const DURATION_HELP = 'Use 30m, 12h, 2d or "off". Up to 30 days.';

const EMOJI_RE = /^<a?:\w+:\d+>$/;
const emojiOk = (e) => !e || EMOJI_RE.test(e) || (e.length <= 8 && /\P{ASCII}/u.test(e));

/** Duration modal: one text input; `min` in ms. */
const durationModal = (title, name, help, key, min) => ({
  title,
  build: (panel) => [label(name, help, textInput('value', { value: store.settingsOf(panel)[key] ? store.formatDuration(store.settingsOf(panel)[key]) : '', placeholder: 'e.g. 12h, 2d or off', required: false, max: 20 }))],
  apply: (i) => {
    const ms = store.parseDuration(readText(i, 'value'));
    if (ms === null) return { error: `That isn't a duration. ${DURATION_HELP}` };
    if (ms && ms < min) return { error: `Pick at least ${store.formatDuration(min)}.` };
    return { patch: { [key]: ms } };
  },
});

const messageModal = (title, name, key) => ({
  title,
  build: (panel) => [label(name, 'Variables work: {user} {ticket.id}. Or {embed:name} for a saved embed.',
    textInput('text', { value: (panel.data || {})[key], paragraph: true, required: false, max: 2000, placeholder: 'Leave empty to use the default' }))],
  apply: async (i, panel, guild) => {
    const text = readText(i, 'text');
    const tag = text.match(/\{embed:([a-z0-9_-]{1,16})\}/i);
    if (tag && !(await findEmbed(guild.id, tag[1]))) return { error: `There's no saved embed called "${tag[1]}". Create it with /embed first.` };
    return { patch: { [key]: text || null } };
  },
});

const MODALS = {
  channels: {
    title: 'Panel Categories & Channels',
    build: (panel) => {
      const s = store.settingsOf(panel);
      return [
        label('Panel Channel', 'Where the panel message is posted', channelSelect('panel', TEXT_CHANNELS, { defaultId: panel.panelChannelId, required: true, placeholder: 'Select panel channel' })),
        label('Log Channel', 'Where ticket events are logged', channelSelect('log', TEXT_CHANNELS, { defaultId: s.logChannelId, placeholder: 'Select log channel' })),
        label('Default Category', 'Where new tickets open', channelSelect('category', CATEGORY, { defaultId: s.categoryId, placeholder: 'Select default category' })),
        label('Closed Category', 'Where closed tickets move', channelSelect('closed', CATEGORY, { defaultId: s.closedCategoryId, placeholder: 'Select closed category' })),
      ];
    },
    apply: (i) => ({
      columns: { panelChannelId: readValues(i, 'panel')[0] ?? null },
      patch: { logChannelId: readValues(i, 'log')[0] ?? null, categoryId: readValues(i, 'category')[0] ?? null, closedCategoryId: readValues(i, 'closed')[0] ?? null },
    }),
  },

  behaviour: {
    title: 'Panel Behaviour Settings',
    build: (panel) => {
      const s = store.settingsOf(panel);
      return [
        label('Delete Delay', 'How long before a deleted ticket channel is removed', textInput('delay', { value: s.deleteDelayMs ? store.formatDuration(s.deleteDelayMs) : '', placeholder: 'e.g., 0s, 5m, 1h', required: false, max: 20 })),
        label('Maximum Open Tickets', 'How many concurrent tickets per member', textInput('max', { value: String(s.maxOpen), max: 2 })),
        label('Auto-Pin Controls', 'Automatically pin ticket control messages', checkbox('pin', s.autoPin)),
        label('Claims Enabled', 'Allow staff to claim tickets', checkbox('claims', s.claims)),
        label('Ping Staff', 'Mention the support roles when a ticket opens', checkbox('ping', s.pingStaff)),
      ];
    },
    apply: (i) => {
      const delay = store.parseDuration(readText(i, 'delay'));
      if (delay === null) return { error: `Delete delay isn't a duration. ${DURATION_HELP}` };
      const max = Number(readText(i, 'max'));
      if (!Number.isInteger(max) || max < 1 || max > 10) return { error: 'Maximum open tickets must be a whole number from 1 to 10.' };
      return { patch: { deleteDelayMs: delay, maxOpen: max, autoPin: readChecked(i, 'pin'), claims: readChecked(i, 'claims'), pingStaff: readChecked(i, 'ping') } };
    },
  },

  nameformat: {
    title: 'Channel name format',
    build: (panel) => {
      const s = store.settingsOf(panel);
      const isPreset = store.NAME_PRESETS.some(p => p.value === s.nameFormat);
      return [
        label('Channel name format', 'How each new ticket channel is named', stringSelect('preset',
          store.NAME_PRESETS.map(p => ({ label: p.label, value: p.value, description: p.sample, ...(p.value === s.nameFormat ? { default: true } : {}) })),
          { placeholder: 'Make a selection', required: false })),
        label('Or type your own', 'Leave empty to use the choice above. Variables: {ticket.id} {user.name} {ticket.option}',
          textInput('custom', { value: isPreset ? '' : s.nameFormat, required: false, max: 60, placeholder: 'support-{ticket.id}' })),
      ];
    },
    apply: (i) => {
      const custom = readText(i, 'custom');
      const preset = readValues(i, 'preset')[0];
      const format = custom || preset;
      if (!format) return { error: 'Pick a format or type your own.' };
      if (!/[\p{L}\p{N}]/u.test(format)) return { error: 'The format needs at least one letter, number or variable.' };
      return { patch: { nameFormat: format } };
    },
  },

  button: {
    title: 'Button label',
    build: (panel) => {
      const s = store.settingsOf(panel);
      return [
        label('Button label', 'Shown on the Open ticket button', textInput('label', { value: (panel.data || {}).buttonLabel, placeholder: 'Open ticket', max: 80 })),
        label('Emoji', 'Optional. A standard emoji or a custom one like <:name:id>', textInput('emoji', { value: s.buttonEmoji, required: false, max: 60 })),
        label('Button colour', null, radio('style', [['primary', 'Blurple'], ['secondary', 'Grey'], ['success', 'Green'], ['danger', 'Red']], s.buttonStyle)),
        label('Layout', 'Several ticket types: buttons or a dropdown', radio('layout', [['auto', 'Auto', 'Buttons for up to 3 types, otherwise a dropdown'], ['buttons', 'Buttons'], ['dropdown', 'Dropdown']], s.layout)),
      ];
    },
    apply: (i) => {
      const text = readText(i, 'label');
      const emoji = readText(i, 'emoji');
      if (!text) return { error: 'The button needs a label.' };
      if (!emojiOk(emoji)) return { error: 'That emoji isn\'t valid. Use a standard emoji or <:name:id>.' };
      return { patch: { buttonLabel: text, buttonEmoji: emoji || null, buttonStyle: readRadio(i, 'style') || 'primary', layout: readRadio(i, 'layout') || 'auto' } };
    },
  },

  placeholder: {
    title: 'Dropdown placeholder',
    build: (panel) => [label('Dropdown placeholder', 'Shown on the ticket type dropdown', textInput('text', { value: (panel.data || {}).placeholder, placeholder: 'Choose a ticket type…', max: 100 }))],
    apply: (i) => {
      const text = readText(i, 'text');
      return text ? { patch: { placeholder: text } } : { error: 'Type some placeholder text.' };
    },
  },

  paneltext: {
    title: 'Built-in panel',
    build: (panel) => {
      const s = store.settingsOf(panel);
      return [
        label('Title', 'Variables work here', textInput('title', { value: s.title, max: 200 })),
        label('Description', null, textInput('desc', { value: s.description, paragraph: true, max: 1800 })),
        label('Colour', 'Hex, like 5865F2', textInput('color', { value: s.color, max: 7, required: false })),
        label('Image URL', 'Optional banner under the text', textInput('image', { value: s.image, required: false, max: 400 })),
        label('Thumbnail URL', 'Optional (used by saved embeds, not the built-in card)', textInput('thumb', { value: s.thumbnail, required: false, max: 400 })),
      ];
    },
    apply: (i) => {
      const color = readText(i, 'color');
      const image = readText(i, 'image');
      const thumb = readText(i, 'thumb');
      if (color && !store.validHex(color)) return { error: 'Colour must be a hex code like 5865F2.' };
      if ((image && !store.validUrl(image)) || (thumb && !store.validUrl(thumb))) return { error: 'Image links must start with http:// or https://.' };
      return { patch: { title: readText(i, 'title') || 'Support', description: readText(i, 'desc'), color: (color || '5865F2').replace('#', ''), image: image || null, thumbnail: thumb || null } };
    },
  },

  embed: {
    title: 'Panel embed',
    build: async (panel, guild) => {
      const { Embed } = require('../database/schemas');
      const rows = await Embed.findAll({ where: { guildId: guild.id }, order: [['name', 'ASC']], limit: 24 });
      if (!rows.length) return { notice: 'You have no saved embeds yet. Create one with `/embed`, then pick it here. Variables like {user} and {server} work inside it.' };
      const current = store.settingsOf(panel).embedName;
      return [label('Saved embed', 'The panel uses this embed, with the open controls underneath', stringSelect('embed', [
        { label: 'None — use the built-in panel', value: '__none', ...(current ? {} : { default: true }) },
        ...rows.map(r => ({ label: r.name, value: r.name, description: preview(r.data?.title || r.data?.description || 'Saved embed', 90) || undefined, ...(r.name === current ? { default: true } : {}) })),
      ], { placeholder: 'Choose an embed', required: true }))];
    },
    apply: (i) => {
      const v = readValues(i, 'embed')[0];
      return { patch: { embedName: !v || v === '__none' ? null : v } };
    },
  },

  support: {
    title: 'Support roles',
    build: (panel) => [label('Support roles', 'Can see, answer and close tickets (up to 5)', roleSelect('roles', { defaults: store.settingsOf(panel).supportRoleIds, required: true, max: 5, placeholder: 'Choose support roles' }))],
    apply: (i) => ({ patch: { supportRoleIds: readValues(i, 'roles') } }),
  },
  allowed: {
    title: 'Who can open tickets',
    build: (panel) => [label('Allowed roles', 'Leave empty to let everyone open tickets', roleSelect('roles', { defaults: store.settingsOf(panel).allowedRoleIds, max: 10, placeholder: 'Everyone' }))],
    apply: (i) => ({ patch: { allowedRoleIds: readValues(i, 'roles') } }),
  },
  blocked: {
    title: 'Blocked roles',
    build: (panel) => [label('Blocked roles', 'Members with these roles can not open tickets', roleSelect('roles', { defaults: store.settingsOf(panel).blockedRoleIds, max: 10, placeholder: 'No one is blocked' }))],
    apply: (i) => ({ patch: { blockedRoleIds: readValues(i, 'roles') } }),
  },

  inactivity: durationModal('Inactivity warning', 'Warn after', 'Remind the member after this much silence. Use 30m, 12h, 2d or "off".', 'inactivityWarnMs', 5 * 60000),
  autoclose: durationModal('Auto-close after', 'Close after', 'Close a ticket after this much silence. Use 30m, 12h, 2d or "off".', 'autoCloseMs', 5 * 60000),
  autodelete: durationModal('Auto-delete after', 'Delete after', 'Delete a closed ticket after this long. Use 1h, 2d or "off".', 'autoDeleteMs', 60000),
  cooldown: durationModal('Cooldown between tickets', 'Cooldown', 'Wait time before the same member can open another. Use 10m, 1h or "off".', 'cooldownMs', 10000),

  rating: {
    title: 'Ask for a rating',
    build: (panel) => [label('Ask for a rating', 'After a ticket closes, the opener can rate the support from 1 to 5', checkbox('ask', store.settingsOf(panel).askRating))],
    apply: (i) => ({ patch: { askRating: readChecked(i, 'ask') } }),
  },
  autoassign: {
    title: 'Auto-assign staff',
    build: (panel) => [label('Auto-assign staff', 'Who gets a new ticket assigned automatically', radio('mode', [
      ['off', 'Off', 'Staff claim tickets themselves'],
      ['random', 'Random', 'A random support member'],
      ['least', 'Least busy', 'The support member with the fewest open claims'],
    ], store.settingsOf(panel).autoAssign))],
    apply: (i) => ({ patch: { autoAssign: readRadio(i, 'mode') || 'off' } }),
  },

  greeting: messageModal('Greeting message', 'Greeting message', 'greeting'),
  closemsg: messageModal('Close message', 'Close message', 'closeMessage'),
  limitmsg: messageModal('Limit reached message', 'Limit reached message', 'limitMessage'),
};

/** The add / edit modal for one ticket type. `opt` is null when adding. */
function optionModal(panel, opt) {
  const comps = [
    label('Name', 'Shown to members and used in {ticket.option}', textInput('name', { value: opt?.name, max: 80, placeholder: 'e.g. Billing' })),
    label('Emoji', 'Optional', textInput('emoji', { value: opt?.emoji, required: false, max: 60 })),
    label('Description', 'Optional, shown in the dropdown', textInput('desc', { value: opt?.description, required: false, max: 100 })),
    label('Category', 'Where this type of ticket opens (optional)', channelSelect('category', CATEGORY, { defaultId: opt?.categoryId, placeholder: 'Use the default category' })),
  ];
  if (opt) comps.push(label('Delete this type', 'Existing tickets of this type stay open', checkbox('delete', false)));
  return { custom_id: id('m', panel.id, 'option', opt?.id || 'new'), title: opt ? 'Edit ticket type' : 'Add ticket type', components: comps };
}

function applyOption(i, panel, optId) {
  const s = store.settingsOf(panel);
  const options = s.options.map(o => ({ ...o }));
  const existing = optId !== 'new' ? options.find(o => o.id === optId) : null;
  if (existing && readChecked(i, 'delete')) return { patch: { options: options.filter(o => o.id !== optId) }, note: `Deleted **${existing.name}**` };

  const name = readText(i, 'name');
  const emoji = readText(i, 'emoji');
  if (!name) return { error: 'The type needs a name.' };
  if (!emojiOk(emoji)) return { error: 'That emoji isn\'t valid. Use a standard emoji or <:name:id>.' };
  if (options.some(o => o.name.toLowerCase() === name.toLowerCase() && o.id !== optId)) return { error: `There's already a type called "${name}".` };

  const next = { id: existing?.id || store.newOptionId(), name, emoji: emoji || null, description: readText(i, 'desc') || null, categoryId: readValues(i, 'category')[0] ?? null };
  if (existing) Object.assign(existing, next);
  else {
    if (options.length >= store.MAX_OPTIONS) return { error: `You can have up to ${store.MAX_OPTIONS} types.` };
    options.push(next);
  }
  return { patch: { options }, note: existing ? `Updated **${name}**` : `Added **${name}**` };
}

/** Full modal payload for an Edit row, or { notice } when it can't open. */
async function buildModal(field, panel, guild) {
  const def = MODALS[field];
  if (!def) return null;
  const components = await def.build(panel, guild);
  if (components?.notice) return components;
  return { custom_id: id('m', panel.id, field), title: def.title.slice(0, 45), components };
}

module.exports = {
  id, TABS, MODALS, effective,
  setupCard, panelPicker, advancedCard, optionsCard,
  openRows, panelMessage,
  buildModal, optionModal, applyOption,
  chan, rolesText, V2, label, textInput, readText,
};
