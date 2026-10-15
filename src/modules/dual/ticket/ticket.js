// @cashholy(carti) — ticket

// hope — ticket
//
//   Setup (Manage Server)
//     ticket setup [name]      one-screen setup, with an Advanced editor for everything else
//     ticket panel [name]      publish the panel again
//     ticket panels            list every panel
//     ticket addrole / removerole <role> [panel]
//     ticket reset <name>      delete a panel
//     ticket variables         every {variable} you can use in panels and messages
//
//   Inside a ticket
//     ticket close [reason] · open · delete · claim · unclaim · transfer <user>
//     ticket add <user> · remove <user> · rename <name> · transcript

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ui = require('../../../services/ui');
const store = require('../../../services/ticketStore');
const view = require('../../../services/ticketView');
const runtime = require('../../../services/ticketRuntime');
const { generateTranscript } = require('../../../services/ticketUtils');
const { publishPanel } = require('../../../events/interactions/ticketHandler');
const { Ticket } = require('../../../database/schemas');

const MAX_PANELS = 10;
const SUBS = ['setup', 'panel', 'panels', 'addrole', 'removerole', 'reset', 'variables',
  'close', 'open', 'delete', 'claim', 'unclaim', 'transfer', 'add', 'remove', 'rename', 'transcript'];
const ADMIN_SUBS = new Set(['setup', 'panel', 'panels', 'addrole', 'removerole', 'reset', 'variables']);

const str = (name, desc, required = false) => (o) => o.setName(name).setDescription(desc).setRequired(required);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Support tickets')
    .addSubcommand(s => s.setName('setup').setDescription('Create or edit a ticket panel').addStringOption(str('name', 'Panel name (default: support)')))
    .addSubcommand(s => s.setName('panel').setDescription('Publish a panel again').addStringOption(str('name', 'Panel name')))
    .addSubcommand(s => s.setName('panels').setDescription('List the ticket panels'))
    .addSubcommand(s => s.setName('addrole').setDescription('Add a support role').addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true)).addStringOption(str('panel', 'Panel name')))
    .addSubcommand(s => s.setName('removerole').setDescription('Remove a support role').addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)).addStringOption(str('panel', 'Panel name')))
    .addSubcommand(s => s.setName('reset').setDescription('Delete a ticket panel').addStringOption(str('name', 'Panel name', true)))
    .addSubcommand(s => s.setName('variables').setDescription('List the variables you can use in panels and messages'))
    .addSubcommand(s => s.setName('close').setDescription('Close this ticket').addStringOption(str('reason', 'Why it is being closed')))
    .addSubcommand(s => s.setName('open').setDescription('Reopen this ticket'))
    .addSubcommand(s => s.setName('delete').setDescription('Delete this ticket'))
    .addSubcommand(s => s.setName('claim').setDescription('Claim this ticket'))
    .addSubcommand(s => s.setName('unclaim').setDescription('Release this ticket'))
    .addSubcommand(s => s.setName('transfer').setDescription('Hand this ticket to another staff member').addUserOption(o => o.setName('user').setDescription('Staff member').setRequired(true)))
    .addSubcommand(s => s.setName('add').setDescription('Add someone to this ticket').addUserOption(o => o.setName('user').setDescription('Member to add').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove someone from this ticket').addUserOption(o => o.setName('user').setDescription('Member to remove').setRequired(true)))
    .addSubcommand(s => s.setName('rename').setDescription('Rename this ticket channel').addStringOption(str('name', 'New name', true)))
    .addSubcommand(s => s.setName('transcript').setDescription('Get this ticket\'s transcript')),

  name: 'ticket',
  aliases: ['tickets'],
  category: 'utility',
  description: 'Support tickets',

  async execute(ctx, args = []) {
    const isSlash = ctx.isChatInputCommand?.() === true;
    const sub = (isSlash ? ctx.options.getSubcommand() : args[0])?.toLowerCase();
    if (!SUBS.includes(sub)) return require('../../../services/helpMenu').sendHelp('tickets', ctx);
    if (!ctx.guild) return ui.say.error(ctx, 'Use this in a server.');

    const user = ctx.user ?? ctx.author;
    const rest = isSlash ? [] : args.slice(1);
    const opt = {
      text: (name) => (isSlash ? ctx.options.getString(name) : null),
      user: async () => (isSlash ? ctx.options.getUser('user') : (ctx.mentions.users.first() ?? (rest[0] ? await ctx.client.users.fetch(rest[0]).catch(() => null) : null))),
      role: () => (isSlash ? ctx.options.getRole('role') : (ctx.mentions.roles.first() ?? ctx.guild.roles.cache.get(rest[0]) ?? null)),
    };
    const out = (container, ephemeral = true) => ui.send(ctx, container, { ephemeral });

    /* ── panel management ── */
    if (ADMIN_SUBS.has(sub)) {
      if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) return ui.say.error(ctx, 'You need the Manage Server permission to manage tickets.');
      return adminCommand({ sub, ctx, user, rest, opt, out, isSlash });
    }

    /* ── inside a ticket ── */
    const found = await runtime.ticketOf(ctx.channel);
    if (!found) return ui.say.error(ctx, 'Use this inside a ticket channel.');
    const { ticket, panel, s } = found;
    const staff = store.isStaff(ctx.member, s);
    const owner = user.id === ticket.userId;

    if (sub === 'close') {
      if (!staff && !owner) return ui.say.error(ctx, 'Only the ticket owner or staff can close this ticket.');
      const reason = (isSlash ? opt.text('reason') : rest.join(' ')) || null;
      const ok = await runtime.closeTicket({ guild: ctx.guild, channel: ctx.channel, ticket, panel, s, closer: user, reason });
      return ok ? (isSlash ? out(ui.success('Ticket closed.')) : null) : ui.say.error(ctx, 'This ticket is already closed.');
    }

    if (!staff) return ui.say.error(ctx, 'Only support staff can do that.');
    const base = { guild: ctx.guild, channel: ctx.channel, ticket, panel, s };

    switch (sub) {
      case 'open': {
        const ok = await runtime.reopenTicket({ ...base, by: user });
        return ok ? out(ui.success('Ticket reopened.')) : ui.say.error(ctx, 'This ticket isn\'t closed.');
      }
      case 'delete': {
        const delayed = s.deleteDelayMs > 0 && !ticket.deleteAt;
        if (isSlash) await out(ui.success(delayed ? 'Deletion scheduled.' : 'Deleting this ticket…'));
        await runtime.deleteTicket({ ...base, by: user });
        return null;
      }
      case 'claim': {
        const res = await runtime.claimTicket({ channel: ctx.channel, ticket, s, staff: user });
        return res.ok ? out(ui.success('You claimed this ticket.')) : ui.say.error(ctx, res.why);
      }
      case 'unclaim': {
        const res = await runtime.unclaimTicket({ channel: ctx.channel, ticket, staff: user });
        return res.ok ? out(ui.success('Ticket released.')) : ui.say.error(ctx, res.why);
      }
      case 'transfer': {
        const target = await opt.user();
        const member = target && await ctx.guild.members.fetch(target.id).catch(() => null);
        if (!member) return ui.say.error(ctx, 'Mention a staff member to transfer to.');
        if (!store.isStaff(member, s)) return ui.say.error(ctx, 'That member isn\'t support staff.');
        await runtime.transferTicket({ channel: ctx.channel, ticket, from: user, to: target });
        return out(ui.success(`Transferred to <@${target.id}>.`));
      }
      case 'add': {
        const target = await opt.user();
        if (!target) return ui.say.error(ctx, 'Mention the member to add.');
        await ctx.channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
        return out(ui.success(`Added <@${target.id}> to this ticket.`), false);
      }
      case 'remove': {
        const target = await opt.user();
        if (!target) return ui.say.error(ctx, 'Mention the member to remove.');
        if (target.id === ticket.userId) return ui.say.error(ctx, 'You can\'t remove the ticket owner.');
        await ctx.channel.permissionOverwrites.delete(target.id).catch(() => {});
        return out(ui.success(`Removed <@${target.id}> from this ticket.`), false);
      }
      case 'rename': {
        const name = store.channelName('{n}', { n: isSlash ? opt.text('name') : rest.join(' ') });
        await ctx.channel.setName(name).catch(() => {});
        return out(ui.success(`Renamed to **${name}**.`));
      }
      case 'transcript': {
        const t = await generateTranscript(ticket, ctx.guild, ctx.client);
        const files = [{ attachment: t.attachment, name: `ticket-${store.pad(ticket.caseNumber ?? ticket.id)}.html` }];
        return isSlash ? ctx.reply({ files, flags: 64 }) : ctx.reply({ files });
      }
      default: return null;
    }
  },
};

/* ── admin subcommands ─────────────────────────────────────────────── */

async function resolvePanel(ctx, name) {
  if (name) return store.findPanelByName(ctx.guild.id, name);
  const here = ctx.channel ? await runtime.ticketOf(ctx.channel) : null;
  if (here?.panel?.id) return here.panel;
  const all = await store.listPanels(ctx.guild.id);
  return all.length === 1 ? all[0] : null;
}

async function adminCommand({ sub, ctx, rest, opt, out, isSlash }) {
  const guild = ctx.guild;

  if (sub === 'setup') {
    const name = store.cleanName(isSlash ? opt.text('name') : rest[0]);
    const panels = await store.listPanels(guild.id);
    let panel = name ? panels.find(p => p.name === name) : (panels.length === 1 ? panels[0] : null);

    if (!panel && !name && panels.length > 1) return out(view.panelPicker(panels));
    if (!panel) {
      if (panels.length >= MAX_PANELS) return ui.say.error(ctx, `A server can have up to ${MAX_PANELS} panels.`);
      panel = await store.createPanel(guild.id, name || 'support');
    }
    return out(view.setupCard(panel, guild));
  }

  if (sub === 'panels') {
    const panels = await store.listPanels(guild.id);
    if (!panels.length) return out(ui.info('No panels yet. Run `ticket setup` to create one.'));
    const lines = [];
    for (const p of panels) {
      const s = store.settingsOf(p);
      const open = await Ticket.count({ where: { guildId: guild.id, panelId: p.id, status: 'open' } });
      lines.push(`**${p.name}** · ${p.panelMessageId ? `published in ${view.chan(guild, p.panelChannelId)}` : 'not published'}\n-# ${s.options.length || 1} ${(s.options.length || 1) === 1 ? 'type' : 'types'} · ${open} open · support ${view.rolesText(s.supportRoleIds) || 'not set'}`);
    }
    return out(ui.box().addTextDisplayComponents(ui.text(`## Ticket panels\n\n${lines.join('\n\n')}`)));
  }

  if (sub === 'variables') {
    const lines = store.TICKET_VARIABLES.map(([tag, desc]) => `\`${tag}\` · ${desc}`);
    return out(ui.box().addTextDisplayComponents(ui.text([
      '## Ticket variables',
      ui.sub('Use them in the panel, greeting, close and limit messages, and in saved embeds.'),
      '', ...lines, '',
      ui.sub('Everything from `/embed variables` works too: {user} {server} {membercount} …'),
      ui.sub('To send a saved embed as a message, write {embed:name} in the message.'),
    ].join('\n'))));
  }

  if (sub === 'panel') {
    const panel = await resolvePanel(ctx, isSlash ? opt.text('name') : rest[0]);
    if (!panel) return ui.say.error(ctx, 'Tell me which panel: `ticket panel <name>`.');
    const res = await publishPanel(guild, panel);
    return res.ok ? out(ui.success(`Published **${panel.name}** in <#${panel.panelChannelId}>.`)) : ui.say.error(ctx, res.why);
  }

  if (sub === 'addrole' || sub === 'removerole') {
    const role = opt.role();
    if (!role) return ui.say.error(ctx, 'Mention a role.');
    const panel = await resolvePanel(ctx, isSlash ? opt.text('panel') : rest[1]);
    if (!panel) return ui.say.error(ctx, 'Tell me which panel (name it as the last word), or create one with `ticket setup`.');
    const s = store.settingsOf(panel);
    const set = new Set(s.supportRoleIds);
    if (sub === 'addrole') { if (set.size >= 5) return ui.say.error(ctx, 'A panel can have up to 5 support roles.'); set.add(role.id); } else set.delete(role.id);
    await store.savePanel(panel, { supportRoleIds: [...set] });
    return out(ui.success(`${sub === 'addrole' ? 'Added' : 'Removed'} <@&${role.id}> ${sub === 'addrole' ? 'to' : 'from'} **${panel.name}**.`));
  }

  if (sub === 'reset') {
    const panel = await store.findPanelByName(guild.id, isSlash ? opt.text('name') : rest[0]);
    if (!panel) return ui.say.error(ctx, 'I couldn\'t find that panel. See `ticket panels`.');
    const card = ui.box('warning')
      .addTextDisplayComponents(ui.text(`## Delete **${panel.name}**?\n${ui.sub('The panel message is removed and its settings are lost. Tickets that are already open keep working.')}`))
      .addActionRowComponents(ui.row(
        ui.btn(view.id('a', 'rst', panel.id), 'Delete panel', { style: 'danger' }),
        ui.btn(view.id('a', 'keep', panel.id), 'Keep it'),
      ));
    return out(card);
  }
  return null;
}
