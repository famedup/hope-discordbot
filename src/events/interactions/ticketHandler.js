/*! © 2026 cashholy (carti) !*/

// hope — ticket interactions. Returns true when it handled the interaction.
//
//   tk:open:<panel>[:<type>]   open a ticket (button)         tk:menu:<panel>   open a ticket (dropdown)
//   tk:s:*   basics card (setup)       tk:a:*   advanced editor       tk:m:*   modal submits
//   tk:t:*   buttons inside a ticket   tk:r:<ticket>:<n>   rating
//   ticket_* / create_ticket           panels and tickets from before the redesign

const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const ui = require('../../services/ui');
const store = require('../../services/ticketStore');
const view = require('../../services/ticketView');
const runtime = require('../../services/ticketRuntime');
const { generateTranscript } = require('../../services/ticketUtils');

const V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;

const say = (i, container) => i.reply({ components: [container], flags: V2 | EPHEMERAL });
const isAdmin = (i) => Boolean(i.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || i.memberPermissions?.has(PermissionFlagsBits.Administrator));

/** Which tab an Edit row lives on (so the card re-renders on the same tab). */
const FIELD_TAB = {
  channels: 'overview', behaviour: 'overview', options: 'overview', option: 'overview',
  embed: 'appearance', paneltext: 'appearance', placeholder: 'appearance', nameformat: 'appearance', button: 'appearance',
  support: 'access', allowed: 'access', blocked: 'access',
  inactivity: 'automation', autoclose: 'automation', autodelete: 'automation', rating: 'automation', cooldown: 'automation', autoassign: 'automation',
  greeting: 'messages', closemsg: 'messages', limitmsg: 'messages',
};
/** Fields whose change is only visible after Publish. */
const NEEDS_PUBLISH = new Set(['channels', 'embed', 'paneltext', 'placeholder', 'button', 'option']);

/* ── publishing the panel ───────────────────────────────────────────── */

async function publishPanel(guild, panel) {
  const s = store.settingsOf(panel);
  if (!panel.panelChannelId) return { ok: false, why: 'Choose a panel channel first.' };
  if (!s.supportRoleIds.length) return { ok: false, why: 'Choose at least one support role first.' };
  const channel = guild.channels.cache.get(panel.panelChannelId);
  if (!channel?.isTextBased?.()) return { ok: false, why: 'The panel channel no longer exists. Pick another one.' };

  const payload = await view.panelMessage(panel, guild);
  const oldChannel = s.postedIn ? guild.channels.cache.get(s.postedIn) : channel;
  const old = panel.panelMessageId && oldChannel ? await oldChannel.messages.fetch(panel.panelMessageId).catch(() => null) : null;

  try {
    if (old && oldChannel.id === channel.id) {
      try { await old.edit(payload); return { ok: true, message: old }; }
      catch { await old.delete().catch(() => {}); } // switching between embed and card layouts needs a fresh message
    } else if (old) {
      await old.delete().catch(() => {});
    }
    const sent = await channel.send(payload);
    await store.savePanel(panel, { postedIn: channel.id }, { panelMessageId: sent.id });
    return { ok: true, message: sent };
  } catch (err) {
    console.error('[tickets] publish', err.message);
    return { ok: false, why: `I couldn't post in ${channel}. Give me View Channel, Send Messages and Embed Links there.` };
  }
}

/* ── basics card ────────────────────────────────────────────────────── */

async function loadPanel(i, panelId) {
  const panel = await store.getPanel(Number(panelId));
  if (!panel || panel.guildId !== i.guild?.id) {
    await say(i, ui.fail('That panel no longer exists. Run `ticket setup` again.'));
    return null;
  }
  return panel;
}

async function setupAction(i, action, panelId) {
  if (!isAdmin(i)) return say(i, ui.info('You need the Manage Server permission to change tickets.'));

  if (action === 'pick') {
    const panel = await loadPanel(i, i.values[0]);
    return panel && i.update({ components: [view.setupCard(panel, i.guild)], flags: V2 });
  }
  const panel = await loadPanel(i, panelId);
  if (!panel) return null;

  if (['ch', 'ro', 'ca'].includes(action)) {
    const draft = { ...(panel.data?.draft || {}) };
    if (action === 'ch') draft.panelChannelId = i.values[0] ?? null;
    if (action === 'ro') draft.supportRoleIds = i.values;
    if (action === 'ca') draft.categoryId = i.values[0] ?? null;
    await store.savePanel(panel, { draft });
    return i.update({ components: [view.setupCard(panel, i.guild)], flags: V2 });
  }

  if (action === 'adv') return i.update({ components: [view.advancedCard(panel, i.guild, 'overview')], flags: V2 });

  if (action === 'save') {
    const { channelId, roleIds, categoryId } = view.effective(panel);
    if (!channelId || !roleIds.length) return i.update({ components: [view.setupCard(panel, i.guild, { note: 'Pick a panel channel and a support role first.' })], flags: V2 });
    await store.savePanel(panel, { supportRoleIds: roleIds, categoryId: categoryId ?? null, draft: null }, { panelChannelId: channelId });
    await i.deferUpdate();
    const res = await publishPanel(i.guild, panel);
    const note = res.ok ? `${ui.ICON.success} Saved and published in <#${panel.panelChannelId}>.` : `${ui.ICON.warning} Saved, but the panel wasn't posted. ${res.why}`;
    return i.editReply({ components: [view.setupCard(panel, i.guild, { note })], flags: V2 });
  }
  return null;
}

/* ── advanced editor ────────────────────────────────────────────────── */

async function advancedAction(i, action, panelId, extra) {
  if (!isAdmin(i)) return say(i, ui.info('You need the Manage Server permission to change tickets.'));
  const panel = await loadPanel(i, panelId);
  if (!panel) return null;

  switch (action) {
    case 'tab': return i.update({ components: [view.advancedCard(panel, i.guild, extra || 'overview')], flags: V2 });
    case 'back': return i.update({ components: [view.setupCard(panel, i.guild)], flags: V2 });

    case 'pub': {
      await i.deferUpdate();
      const res = await publishPanel(i.guild, panel);
      const note = res.ok ? `${ui.ICON.success} Published in <#${panel.panelChannelId}>.` : `${ui.ICON.warning} ${res.why}`;
      return i.editReply({ components: [view.advancedCard(panel, i.guild, extra || 'overview', { note })], flags: V2 });
    }

    case 'edit': {
      if (extra === 'options') return i.update({ components: [view.optionsCard(panel, i.guild)], flags: V2 });
      const modal = await view.buildModal(extra, panel, i.guild);
      if (!modal) return say(i, ui.fail('That setting no longer exists.'));
      if (modal.notice) return say(i, ui.info(modal.notice));
      return i.showModal(modal);
    }

    case 'optadd': return i.showModal(view.optionModal(panel, null));
    case 'optedit': {
      const opt = store.settingsOf(panel).options.find(o => o.id === extra);
      return opt ? i.showModal(view.optionModal(panel, opt)) : say(i, ui.fail('That ticket type no longer exists.'));
    }

    case 'rst': {
      const s = store.settingsOf(panel);
      const channel = s.postedIn ? i.guild.channels.cache.get(s.postedIn) : null;
      const msg = panel.panelMessageId && channel ? await channel.messages.fetch(panel.panelMessageId).catch(() => null) : null;
      await msg?.delete().catch(() => {});
      await panel.destroy();
      return i.update({ components: [ui.success(`Panel **${panel.name}** deleted. Existing tickets keep working.`)], flags: V2 });
    }
    case 'keep': return i.update({ components: [ui.info('Nothing was deleted.')], flags: V2 });
    default: return null;
  }
}

async function modalSubmit(i, panelId, field, extra) {
  if (!isAdmin(i)) return say(i, ui.info('You need the Manage Server permission to change tickets.'));
  const panel = await loadPanel(i, panelId);
  if (!panel) return null;

  let result;
  if (field === 'option') result = view.applyOption(i, panel, extra);
  else {
    const def = view.MODALS[field];
    if (!def) return say(i, ui.fail('That setting no longer exists.'));
    result = await def.apply(i, panel, i.guild);
  }
  if (result.error) return say(i, ui.fail(result.error));

  await store.savePanel(panel, result.patch || {}, result.columns || {});

  const tab = FIELD_TAB[field] || 'overview';
  const hint = NEEDS_PUBLISH.has(field) && panel.panelMessageId ? ' Press **Publish** to update the panel message.' : '';
  const note = `${ui.ICON.success} ${result.note || 'Saved.'}${hint}`;
  const card = field === 'option' ? view.optionsCard(panel, i.guild, { note }) : view.advancedCard(panel, i.guild, tab, { note });
  const payload = { components: [card], flags: V2 };
  return i.isFromMessage?.() ? i.update(payload) : i.reply({ ...payload, flags: V2 | EPHEMERAL });
}

/* ── opening ────────────────────────────────────────────────────────── */

async function openAction(i, panelId, optionId) {
  const panel = await store.getPanel(Number(panelId));
  if (!panel || panel.guildId !== i.guild?.id) return say(i, ui.fail('This panel no longer exists.'));
  return runtime.openTicket(i, panel, optionId && optionId !== '-' ? optionId : null);
}

/* ── buttons inside a ticket ────────────────────────────────────────── */

async function ticketAction(i, action) {
  const found = await runtime.ticketOf(i.channel);
  if (!found) return say(i, ui.info('This isn\'t a ticket channel.'));
  const { ticket, panel, s } = found;
  const staff = store.isStaff(i.member, s);
  const opener = i.user.id === ticket.userId;
  const ctx = { guild: i.guild, channel: i.channel, ticket, panel, s };

  if (action === 'close') {
    if (!staff && !opener) return say(i, ui.info('Only the ticket owner or staff can close this ticket.'));
    if (ticket.status !== 'open') return say(i, ui.info('This ticket is already closed.'));
    return i.showModal({
      custom_id: 'tk:t:closemodal', title: 'Close ticket',
      components: [view.label('Reason', 'Optional. Shown in the close message and the logs', view.textInput('reason', { paragraph: true, required: false, max: 500, placeholder: 'Resolved, duplicate, no reply…' }))],
    });
  }

  if (!staff) return say(i, ui.info('Only support staff can do that.'));

  if (action === 'claim') {
    const res = await runtime.claimTicket({ channel: i.channel, ticket, s, staff: i.user });
    if (!res.ok) return say(i, ui.info(res.why));
    // refresh the control row on the message the button lives on
    const message = i.message;
    if (message?.flags?.has?.(V2) && !s.greeting) {
      const owner = await i.client.users.fetch(ticket.userId).catch(() => ({ id: ticket.userId }));
      return i.update(runtime.defaultGreeting({ ticket, panel, s, opener: owner, lead: '' }));
    }
    return i.update({ components: [...message.components.slice(0, -1), runtime.controlRow(s, ticket)] });
  }

  await i.deferReply({ flags: EPHEMERAL });

  if (action === 'reopen') {
    const ok = await runtime.reopenTicket({ ...ctx, by: i.user });
    return i.editReply({ components: [ok ? ui.success('Ticket reopened.') : ui.info('This ticket isn\'t closed.')], flags: V2 });
  }
  if (action === 'delete') {
    const res = await runtime.deleteTicket({ ...ctx, by: i.user });
    return i.editReply({ components: [res === 'scheduled' ? ui.success('Deletion scheduled.') : ui.success('Ticket deleted.')], flags: V2 }).catch(() => {});
  }
  if (action === 'transcript') {
    const transcript = await generateTranscript(ticket, i.guild, i.client);
    return i.editReply({ files: [{ attachment: transcript.attachment, name: `ticket-${store.pad(ticket.caseNumber ?? ticket.id)}.html` }] });
  }
  return null;
}

async function closeModal(i) {
  const found = await runtime.ticketOf(i.channel);
  if (!found) return say(i, ui.info('This isn\'t a ticket channel.'));
  const { ticket, panel, s } = found;
  if (!store.isStaff(i.member, s) && i.user.id !== ticket.userId) return say(i, ui.info('Only the ticket owner or staff can close this ticket.'));

  await i.deferReply({ flags: EPHEMERAL });
  const reason = view.readText(i, 'reason') || null;
  const ok = await runtime.closeTicket({ guild: i.guild, channel: i.channel, ticket, panel, s, closer: i.user, reason });
  return i.editReply({ components: [ok ? ui.success('Ticket closed.') : ui.info('This ticket is already closed.')], flags: V2 });
}

/* ── router ─────────────────────────────────────────────────────────── */

const LEGACY = { ticket_claim: 'claim', ticket_close: 'close', ticket_reopen: 'reopen', ticket_delete: 'delete' };

async function handle(interaction) {
  const cid = interaction.customId;
  if (!cid) return false;
  const isLegacy = cid in LEGACY || cid === 'create_ticket';
  if (!cid.startsWith('tk:') && !isLegacy) return false;
  if (!interaction.guild) return false;

  try {
    if (cid === 'create_ticket') { await say(interaction, ui.info('This panel is from an older version. Ask an admin to run `ticket setup` and publish the new panel.')); return true; }
    if (cid in LEGACY && interaction.isButton()) { await ticketAction(interaction, LEGACY[cid]); return true; }

    const [, area, action, a, b] = cid.split(':');

    if (interaction.isModalSubmit()) {
      if (area === 't' && action === 'closemodal') { await closeModal(interaction); return true; }
      if (area === 'm') { await modalSubmit(interaction, action, a, b); return true; } // tk:m:<panel>:<field>[:<opt>]
      return false;
    }

    if (area === 'open' && interaction.isButton()) { await openAction(interaction, action, a); return true; }
    if (area === 'menu' && interaction.isStringSelectMenu()) { await openAction(interaction, action, interaction.values[0]); return true; }
    if (area === 't' && interaction.isButton()) { await ticketAction(interaction, action); return true; }
    if (area === 'r' && interaction.isButton()) { await runtime.rateTicket(interaction, Number(action), Number(a)); return true; }
    if (area === 's') { await setupAction(interaction, action, a); return true; }
    if (area === 'a') { await advancedAction(interaction, action, a, b); return true; }
  } catch (err) {
    console.error('[tickets]', err);
    const body = { components: [ui.fail('Something went wrong. Try again.')], flags: V2 | EPHEMERAL };
    try { if (interaction.deferred || interaction.replied) await interaction.followUp(body); else await interaction.reply(body); } catch { /* gone */ }
    return true;
  }
  return false;
}

module.exports = { handle, publishPanel };
