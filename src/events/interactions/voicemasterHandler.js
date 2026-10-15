/**
 * @file voicemasterHandler.js
 * @developer cashholy (carti)
 */

// hope — voicemaster interactions (panel, dashboard, setup).
// Returns true when it handled the interaction (see events/interactionCreate.js).

const {
  MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelType, PermissionFlagsBits,
} = require('discord.js');
const ui = require('../../services/ui');
const view = require('../../services/voicemasterView');
const { J2CConfig, TempChannel } = require('../../database/schemas');
const { invalidate } = require('../voiceStateUpdate');

const { ID } = view;
const V2 = MessageFlags.IsComponentsV2;
const PRIVATE = MessageFlags.Ephemeral;

/* ── helpers ────────────────────────────────────────────────────────── */

const say = (i, container) => i.reply({ components: [container], flags: V2 | PRIVATE });
const warn = (i, text) => say(i, ui.info(text));

/** The room this user owns: the one they are sitting in, otherwise their registered room. */
async function roomOf(i) {
  const { guild, user } = i;
  const here = i.member?.voice?.channel;
  if (here) {
    const rec = await TempChannel.findOne({ where: { guildId: guild.id, channelId: here.id }, raw: true });
    if (rec?.ownerId === user.id) return here;
  }
  const rec = await TempChannel.findOne({ where: { guildId: guild.id, ownerId: user.id }, raw: true });
  if (!rec) return null;
  const vc = guild.channels.cache.get(rec.channelId) ?? await guild.channels.fetch(rec.channelId).catch(() => null);
  if (!vc) { await TempChannel.destroy({ where: { channelId: rec.channelId } }); return null; }
  return vc;
}

async function noRoom(i) {
  const cfg = await J2CConfig.findOne({ where: { guildId: i.guild.id }, raw: true });
  return warn(i, `You don't have a room yet. ${cfg ? `Join <#${cfg.voiceChannelId}> to create one.` : 'Join the trigger channel to create one.'}`);
}

/** Owners must always be able to reach their own room, even when it is locked or hidden. */
const keepOwnerIn = (vc, ownerId) => vc.permissionOverwrites.edit(ownerId, { Connect: true, ViewChannel: true }).catch(() => {});

async function openDashboard(i, note) {
  const vc = await roomOf(i);
  if (!vc) return noRoom(i);
  return i.reply({ components: [view.dashboard(vc, { ownerId: i.user.id, note })], flags: V2 | PRIVATE });
}

/* ── dashboard actions (each edits the same private message) ────────── */

const ACTIONS = {
  async [ID.lock](vc, i) {
    const locked = view.isLocked(vc);
    if (!locked) await keepOwnerIn(vc, i.user.id);
    await vc.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: locked ? null : false });
    return { vc, note: locked ? 'Unlocked the room' : 'Locked the room' };
  },
  async [ID.hide](vc, i) {
    const hidden = view.isHidden(vc);
    if (!hidden) await keepOwnerIn(vc, i.user.id);
    await vc.permissionOverwrites.edit(i.guild.roles.everyone, { ViewChannel: hidden ? null : false });
    return { vc, note: hidden ? 'Room is visible again' : 'Hid the room' };
  },
  async [ID.inc](vc) {
    const next = Math.min((vc.userLimit || 0) + 1, view.MAX_LIMIT);
    return { vc: await vc.edit({ userLimit: next }), note: `Limit set to ${next}` };
  },
  async [ID.dec](vc) {
    const next = Math.max((vc.userLimit || 0) - 1, 0);
    return { vc: await vc.edit({ userLimit: next }), note: next ? `Limit set to ${next}` : 'Limit removed' };
  },
};

async function dashboardAction(i) {
  const vc = await roomOf(i);
  if (!vc) return i.update({ components: [ui.info('That room is gone. Join the trigger channel to make a new one.')], flags: V2 });

  try {
    const { vc: fresh, note } = await ACTIONS[i.customId](vc, i);
    return await i.update({ components: [view.dashboard(fresh, { ownerId: i.user.id, note })], flags: V2 });
  } catch (err) {
    console.error('[voicemaster]', err.message);
    return i.update({ components: [view.dashboard(vc, { ownerId: i.user.id, note: "I couldn't do that. Check my Manage Channels permission." })], flags: V2 });
  }
}

async function kick(i) {
  const vc = await roomOf(i);
  if (!vc) return i.update({ components: [ui.info('That room is gone.')], flags: V2 });

  const target = vc.members.get(i.values[0]);
  let note = 'They already left';
  const gone = [];
  if (target && target.id !== i.user.id) {
    try { await target.voice.disconnect(); note = `Removed ${target.displayName}`; gone.push(target.id); }
    catch { note = "I couldn't remove them. Check my Move Members permission."; }
  }
  return i.update({ components: [view.dashboard(vc, { ownerId: i.user.id, note, gone })], flags: V2 });
}

async function openRename(i) {
  const vc = await roomOf(i);
  if (!vc) return noRoom(i);
  const input = new TextInputBuilder()
    .setCustomId('name').setLabel('Room name').setStyle(TextInputStyle.Short)
    .setMinLength(1).setMaxLength(100).setRequired(true).setValue(vc.name.slice(0, 100));
  return i.showModal(new ModalBuilder().setCustomId(ID.modal).setTitle('Rename your room').addComponents(new ActionRowBuilder().addComponents(input)));
}

async function submitRename(i) {
  const vc = await roomOf(i);
  if (!vc) return noRoom(i);
  const name = i.fields.getTextInputValue('name').trim().slice(0, 100);
  if (!name) return warn(i, 'A room needs a name.');

  let note = `Renamed to ${name}`;
  try { await vc.setName(name); }
  catch { note = 'Discord only allows two renames every ten minutes. Try again soon.'; }

  const payload = { components: [view.dashboard(vc, { ownerId: i.user.id, note })], flags: V2 };
  return i.isFromMessage?.() ? i.update(payload) : i.reply({ ...payload, flags: V2 | PRIVATE });
}

async function claim(i) {
  const vc = i.member?.voice?.channel;
  if (!vc) return warn(i, 'Join the room you want to claim first.');

  const rec = await TempChannel.findOne({ where: { guildId: i.guild.id, channelId: vc.id }, raw: true });
  if (!rec) return warn(i, 'This isn\'t a voicemaster room.');
  if (rec.ownerId === i.user.id) return openDashboard(i, 'You already own this room');
  if (vc.members.has(rec.ownerId)) return warn(i, 'The owner is still in the room.');

  const owned = await TempChannel.findOne({ where: { guildId: i.guild.id, ownerId: i.user.id }, raw: true });
  if (owned && owned.channelId !== vc.id && i.guild.channels.cache.has(owned.channelId)) {
    return warn(i, `You already own <#${owned.channelId}>.`);
  }

  try {
    await TempChannel.update({ ownerId: i.user.id }, { where: { channelId: vc.id } });
    await vc.permissionOverwrites.delete(rec.ownerId).catch(() => {});
    if (view.isLocked(vc) || view.isHidden(vc)) await keepOwnerIn(vc, i.user.id);
    await vc.setName(`${i.user.displayName}'s VC`).catch(() => {});
  } catch (err) {
    console.error('[voicemaster] claim', err.message);
    return warn(i, "I couldn't transfer the room. Check my Manage Channels permission.");
  }
  return i.reply({ components: [view.dashboard(vc, { ownerId: i.user.id, note: 'You claimed this room' })], flags: V2 | PRIVATE });
}

/* ── setup ──────────────────────────────────────────────────────────── */

const sessions = new Map(); // `${guildId}:${userId}` → { picks, at }
const SESSION_TTL = 30 * 60 * 1000;
const keyOf = (i) => `${i.guild.id}:${i.user.id}`;

function session(i) {
  const now = Date.now();
  for (const [k, s] of sessions) if (now - s.at > SESSION_TTL) sessions.delete(k);
  const s = sessions.get(keyOf(i));
  if (s) s.at = now;
  return s;
}

/** Called by the command to start (or restart) a setup session, optionally pre-filled. */
function startSession(guildId, userId, picks = {}) {
  sessions.set(`${guildId}:${userId}`, { picks: { ...picks }, at: Date.now() });
  return sessions.get(`${guildId}:${userId}`).picks;
}

async function isAdmin(i) {
  if (i.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  await warn(i, 'Only administrators can change voicemaster.');
  return false;
}

async function publish({ guild, text, voice, category }) {
  await J2CConfig.upsert({ guildId: guild.id, textChannelId: text, voiceChannelId: voice, categoryId: category });
  invalidate?.(guild.id);
  const channel = guild.channels.cache.get(text);
  if (!channel) return "I couldn't find the panel channel.";
  try { await channel.send({ components: [view.panel({ triggerId: voice })], flags: V2 }); return null; }
  catch { return "Saved, but I couldn't post the panel. Give me Send Messages there and press Repost panel in /voicemaster config."; }
}

async function setupPick(i, field) {
  if (!(await isAdmin(i))) return;
  const s = session(i);
  if (!s) return i.update({ components: [ui.info('Setup expired. Run `/voicemaster setup` again.')], flags: V2 });
  s.picks[field] = i.values[0];
  return i.update({ components: [view.setup({ picks: s.picks })], flags: V2 });
}

async function setupSave(i) {
  if (!(await isAdmin(i))) return;
  const s = session(i);
  const { text, voice, category } = s?.picks ?? {};
  if (!text || !voice || !category) return i.update({ components: [view.setup({ picks: s?.picks })], flags: V2 });

  const note = await publish({ guild: i.guild, text, voice, category });
  sessions.delete(keyOf(i));
  return i.update({ components: [view.live({ text, voice, category, note })], flags: V2 });
}

async function setupAuto(i) {
  if (!(await isAdmin(i))) return;
  await i.deferUpdate();
  try {
    const { guild, client } = i;
    const category = await guild.channels.create({ name: 'voicemaster', type: ChannelType.GuildCategory, reason: 'voicemaster setup' });
    const voice = await guild.channels.create({ name: 'join to create', type: ChannelType.GuildVoice, parent: category.id, reason: 'voicemaster setup' });
    const text = await guild.channels.create({
      name: 'interface', type: ChannelType.GuildText, parent: category.id, reason: 'voicemaster setup',
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    });
    const note = await publish({ guild, text: text.id, voice: voice.id, category: category.id });
    sessions.delete(keyOf(i));
    return i.editReply({ components: [view.live({ text: text.id, voice: voice.id, category: category.id, note })], flags: V2 });
  } catch (err) {
    console.error('[voicemaster] auto setup', err.message);
    return i.editReply({ components: [ui.fail("I couldn't create the channels. Give me the Manage Channels permission and try again.")], flags: V2 });
  }
}

async function setupCancel(i) {
  sessions.delete(keyOf(i));
  return i.update({ components: [ui.info('Setup cancelled.')], flags: V2 });
}

async function repost(i) {
  if (!(await isAdmin(i))) return;
  const cfg = await J2CConfig.findOne({ where: { guildId: i.guild.id }, raw: true });
  if (!cfg) return warn(i, 'voicemaster isn\'t set up here.');
  const channel = i.guild.channels.cache.get(cfg.textChannelId);
  if (!channel) return warn(i, 'The panel channel was deleted. Run `/voicemaster setup` again.');
  try {
    await channel.send({ components: [view.panel({ triggerId: cfg.voiceChannelId })], flags: V2 });
    return say(i, ui.success(`Panel posted in <#${channel.id}>`));
  } catch {
    return warn(i, "I couldn't post there. Give me Send Messages in that channel.");
  }
}

/* ── router ─────────────────────────────────────────────────────────── */

async function handle(interaction) {
  const id = interaction.customId;
  if (!id || !(id.startsWith('vm_') || id.startsWith('j2c_'))) return false;

  try {
    // panels posted before the rename still carry j2c_* ids: send those users to the new dashboard
    if (id.startsWith('j2c_')) {
      if (interaction.isButton() && interaction.guild) { await openDashboard(interaction, 'This panel is from an older version. Ask an admin to run /voicemaster setup.'); return true; }
      await warn(interaction, 'This panel is outdated. Ask an admin to run `/voicemaster setup`.');
      return true;
    }

    if (interaction.isButton()) {
      switch (id) {
        case ID.manage: await openDashboard(interaction); break;
        case ID.claim: await claim(interaction); break;
        case ID.rename: await openRename(interaction); break;
        case ID.lock: case ID.hide: case ID.inc: case ID.dec: await dashboardAction(interaction); break;
        case ID.save: await setupSave(interaction); break;
        case ID.auto: await setupAuto(interaction); break;
        case ID.cancel: await setupCancel(interaction); break;
        case ID.repost: await repost(interaction); break;
        default: return false;
      }
      return true;
    }

    if (interaction.isStringSelectMenu() && id === ID.kick) { await kick(interaction); return true; }

    if (interaction.isChannelSelectMenu()) {
      const field = { [ID.setupText]: 'text', [ID.setupVoice]: 'voice', [ID.setupCategory]: 'category' }[id];
      if (!field) return false;
      await setupPick(interaction, field);
      return true;
    }

    if (interaction.isModalSubmit() && id === ID.modal) { await submitRename(interaction); return true; }
  } catch (err) {
    console.error('[voicemaster]', err);
    const body = { components: [ui.fail('Something went wrong. Try again.')], flags: V2 | PRIVATE };
    try { if (interaction.deferred || interaction.replied) await interaction.followUp(body); else await interaction.reply(body); } catch (_) { /* gone */ }
    return true;
  }
  return false;
}

module.exports = { handle, startSession };
