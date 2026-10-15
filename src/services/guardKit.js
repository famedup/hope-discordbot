// [dev] cashholy (carti) :: services/guardKit.js

// hope — shared UI kit for the Antinuke and Automod panels.
//
// Uses the newer Discord components:
//   • Section rows with a button accessory  → toggle switches
//   • Modals built from Labels              → radio groups, checkboxes, channel pickers
// Older discord.js builds fall back to select menus where a newer builder is missing.

const D = require('discord.js');
const ui = require('./ui');

const V2 = D.MessageFlags.IsComponentsV2;

/* ── message components ────────────────────────────────────────────── */

/** A row with text on the left and an On/Off switch on the right. */
function toggle(id, title, desc, on, { disabled = false, label } = {}) {
  const sec = new D.SectionBuilder()
    .addTextDisplayComponents(ui.text(desc ? `**${title}**\n-# ${desc}` : `**${title}**`))
    .setButtonAccessory(ui.btn(id, label ?? (on ? 'On' : 'Off'), { style: on ? 'success' : 'secondary', disabled }));
  return sec;
}

/** A row with text on the left and one action button on the right. */
function action(id, title, desc, buttonLabel, { disabled = false, style = 'secondary' } = {}) {
  return new D.SectionBuilder()
    .addTextDisplayComponents(ui.text(desc ? `**${title}**\n-# ${desc}` : `**${title}**`))
    .setButtonAccessory(ui.btn(id, buttonLabel, { style, disabled }));
}

/** Title block with the master switch on the right. */
function header(title, desc, switchId, on, disabled) {
  return new D.SectionBuilder()
    .addTextDisplayComponents(ui.text(`## ${title}\n-# ${desc}`))
    .setButtonAccessory(ui.btn(switchId, on ? 'Enabled' : 'Disabled', { style: on ? 'success' : 'secondary', disabled }));
}

const nav = (id, options, current, disabled) =>
  ui.row(ui.select(id, 'Jump to…', options.map(o => ({ ...o, default: o.value === current })), { disabled }));

/** Multi-select where the ticked options are the enabled ones. */
const multi = (id, placeholder, options, active, disabled) =>
  ui.row(ui.select(id, placeholder, options.map(o => ({ ...o, default: active.includes(o.value) })), { min: 0, max: options.length, disabled }));

/** Single-choice select with the current value marked. */
const single = (id, placeholder, options, current, disabled) =>
  ui.row(ui.select(id, placeholder, options.map(o => ({ ...o, default: o.value === current })), { disabled }));

const chip = (on) => (on ? 'On' : 'Off');
const chanLabel = (guild, id) => (id && guild.channels.cache.has(id) ? `<#${id}>` : 'Not set');

/* ── modal builders ────────────────────────────────────────────────── */

const hasRadio = typeof D.RadioGroupBuilder === 'function';
const hasCheckbox = typeof D.CheckboxBuilder === 'function';

function modal(id, title, ...parts) {
  const m = new D.ModalBuilder().setCustomId(id).setTitle(title);
  for (const p of parts) {
    if (p instanceof D.TextDisplayBuilder) m.addTextDisplayComponents(p);
    else m.addLabelComponents(p);
  }
  return m;
}

function labelRadio(label, id, options, current, description) {
  const l = new D.LabelBuilder().setLabel(label);
  if (description) l.setDescription(description);
  const opts = options.map(o => ({ value: o.value, label: o.label, description: o.description, default: o.value === current }));
  if (hasRadio) {
    l.setRadioGroupComponent(new D.RadioGroupBuilder({ custom_id: id, required: true, options: opts }));
  } else {
    l.setStringSelectMenuComponent(new D.StringSelectMenuBuilder().setCustomId(id).addOptions(opts));
  }
  return l;
}

function labelCheck(label, id, current, description) {
  const l = new D.LabelBuilder().setLabel(label);
  if (description) l.setDescription(description);
  if (hasCheckbox) {
    l.setCheckboxComponent(new D.CheckboxBuilder({ custom_id: id, default: !!current }));
  } else {
    l.setStringSelectMenuComponent(new D.StringSelectMenuBuilder().setCustomId(id).addOptions([
      { label: 'Yes', value: 'yes', default: !!current }, { label: 'No', value: 'no', default: !current },
    ]));
  }
  return l;
}

function labelChannel(label, id, current, description) {
  const sel = new D.ChannelSelectMenuBuilder()
    .setCustomId(id)
    .setChannelTypes(D.ChannelType.GuildText, D.ChannelType.GuildAnnouncement)
    .setMinValues(0).setMaxValues(1).setRequired(false);
  if (current) sel.setDefaultChannels(current);
  const l = new D.LabelBuilder().setLabel(label).setChannelSelectMenuComponent(sel);
  if (description) l.setDescription(description);
  return l;
}

function labelText(label, id, { value, placeholder, min = 0, max = 100, paragraph = false, required = false, description } = {}) {
  const t = new D.TextInputBuilder()
    .setCustomId(id)
    .setStyle(paragraph ? D.TextInputStyle.Paragraph : D.TextInputStyle.Short)
    .setRequired(required).setMinLength(min).setMaxLength(max);
  if (value !== undefined && value !== null && value !== '') t.setValue(String(value).slice(0, max));
  if (placeholder) t.setPlaceholder(placeholder);
  const l = new D.LabelBuilder().setLabel(label).setTextInputComponent(t);
  if (description) l.setDescription(description);
  return l;
}

const readRadio = (sub, id) => {
  try { const v = sub.fields.getRadioGroup(id); if (v) return v; } catch (_) { /* fall through */ }
  try { return sub.fields.getStringSelectValues(id)[0] ?? null; } catch (_) { return null; }
};
const readCheck = (sub, id) => {
  if (hasCheckbox) { try { return !!sub.fields.getCheckbox(id); } catch (_) { /* fall through */ } }
  try { return sub.fields.getStringSelectValues(id)[0] === 'yes'; } catch (_) { return false; }
};
const readChannel = (sub, id) => {
  try { return sub.fields.getSelectedChannels(id, false)?.first()?.id ?? null; } catch (_) { return null; }
};
const readText = (sub, id) => {
  try { return sub.fields.getTextInputValue(id).trim(); } catch (_) { return ''; }
};

/* ── panel runtime ─────────────────────────────────────────────────── */

/**
 * Keeps one message alive as a live panel.
 *  render(disabled) → ContainerBuilder
 *  handle(i)        → called for every component click (must respond to `i`)
 */
function mount(msg, { userId, render, handle, minutes = 15 }) {
  const col = msg.createMessageComponentCollector({ filter: ui.onlyUser(userId), time: minutes * 60_000 });
  col.on('collect', async (i) => {
    try { await handle(i); } catch (e) { console.error('[panel]', e); }
  });
  col.on('end', () => { msg.edit({ components: [render(true)], flags: V2 }).catch(() => {}); });
  return col;
}

/** Acknowledge, run `work`, then redraw the panel in place. */
async function act(i, render, work) {
  await i.deferUpdate();
  let err = null;
  try { await work?.(); } catch (e) { err = e; console.error('[panel]', e); }
  await i.editReply({ components: [render(false, err)], flags: V2 }).catch(() => {});
}

/** Show a modal, wait for the submit, run `work(sub)`, then redraw. */
async function askModal(i, built, render, work) {
  await i.showModal(built);
  const sub = await i.awaitModalSubmit({
    time: 300_000,
    filter: (m) => m.customId === built.data.custom_id && m.user.id === i.user.id,
  }).catch(() => null);
  if (!sub) return;
  await sub.deferUpdate();
  let err = null;
  try { await work(sub); } catch (e) { err = e; }
  await sub.editReply({ components: [render(false, err)], flags: V2 }).catch(() => {});
}

const errorLine = (err) => (err ? `-# ${ui.emojis.error} ${String(err.message || err).slice(0, 140)}` : null);

module.exports = {
  D, V2,
  toggle, action, header, nav, multi, single, chip, chanLabel,
  modal, labelRadio, labelCheck, labelChannel, labelText,
  readRadio, readCheck, readChannel, readText,
  mount, act, askModal, errorLine,
};
