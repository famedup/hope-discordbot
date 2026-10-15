//
//  Made with care by cashholy (carti)
//

// hope — buttonrole (br): self-assign role panels built from buttons. Prefix only.
//   br create [#channel] [title]
//   br add <message link | id> <@role> <emoji> [label]
//   br remove <message link | id> <@role>
//   br title <message link | id> <text>
//   br delete <message link | id>

const ui = require('../../../services/ui');
const rt = require('../../../services/roleTools');
const bp = require('../../../services/buttonRolePanel');

const HELP = ui.card({
  title: 'Button roles',
  lines: [
    '`br create [#channel] [title]`',
    '`br add <message link | id> <@role> <emoji> [label]`',
    '`br remove <message link | id> <@role>`',
    '`br title <message link | id> <text>`',
    '`br delete <message link | id>`',
  ],
});

module.exports = {
  name: 'buttonrole',
  description: 'Role panels with buttons',
  aliases: ['br'],
  category: 'moderation',

  async execute(message, args) {
    const { guild, member, client } = message;
    if (!member.permissions.has('ManageRoles')) return rt.bad(message, 'Missing **Manage Roles** permission');

    const sub = (args[0] || '').toLowerCase();
    if (!['create', 'add', 'remove', 'title', 'delete'].includes(sub)) return rt.send(message, HELP);
    const rest = args.slice(1);

    if (sub === 'create') {
      let channel = message.channel;
      const ci = rest.findIndex(t => /^<#\d+>$/.test(t));
      if (ci !== -1) {
        channel = rt.findChannel(guild, rest[ci]);
        if (!channel?.isTextBased()) return rt.bad(message, 'Channel not found');
        rest.splice(ci, 1);
      }
      if (!channel.permissionsFor(guild.members.me)?.has(['ViewChannel', 'SendMessages'])) return rt.bad(message, `I can't send in ${channel}`);
      const sent = await channel.send(bp.payload({ title: rest.join(' ').trim().slice(0, 100) || 'Roles', items: [] })).catch(() => null);
      if (!sent) return rt.bad(message, 'Couldn\'t create the panel');
      return rt.ok(message, `Panel created — ${sent.url}\n${ui.sub('Add roles with `br add <message> <@role> <emoji>`')}`);
    }

    // everything else targets an existing message
    const target = await rt.resolveMessage(guild, rest.shift(), message.channel);
    if (!target) return rt.bad(message, 'Message not found — use a message link or id');
    if (target.author.id !== client.user.id) return rt.bad(message, 'That isn\'t my message — make one with `br create`');
    const panel = bp.parsePanel(target, client.user.id) || (sub !== 'delete' && /^### /.test(target.components?.[0]?.components?.[0]?.content || '') ? { title: target.components[0].components[0].content.replace(/^### /, ''), items: [] } : null);
    if (!panel) return rt.bad(message, 'That isn\'t a button role panel');

    if (sub === 'delete') {
      await target.delete().catch(() => {});
      return rt.ok(message, 'Panel deleted');
    }

    if (sub === 'title') {
      const title = rest.join(' ').trim().slice(0, 100);
      if (!title) return rt.send(message, HELP);
      panel.title = title;
      await target.edit(bp.payload(panel));
      return rt.ok(message, `Title set on ${target.id}`);
    }

    const role = rt.findRole(guild, rest.shift());
    const blocked = rt.roleBlocked(guild, member, role);
    if (blocked) return rt.bad(message, blocked);

    if (sub === 'remove') {
      if (!panel.items.some(i => i.roleId === role.id)) return rt.warn(message, `${role} isn't on that panel`);
      panel.items = panel.items.filter(i => i.roleId !== role.id);
      await target.edit(bp.payload(panel));
      return rt.ok(message, `Removed ${role} from ${target.id}`);
    }

    // add: <emoji> [label…]
    let emoji = '';
    if (rest[0] && rt.parseEmojiToken(rest[0])) emoji = rest.shift();
    const label = (rest.join(' ').trim() || (emoji ? '' : role.name)).slice(0, 80);

    const existing = panel.items.find(i => i.roleId === role.id);
    if (!existing && panel.items.length >= bp.MAX) return rt.warn(message, `A panel holds ${bp.MAX} roles at most`);
    if (existing) { existing.label = label; existing.emoji = emoji; }
    else panel.items.push({ roleId: role.id, label, emoji });

    try {
      await target.edit(bp.payload(panel));
    } catch (e) {
      return rt.bad(message, `Couldn't update the panel: ${String(e.message || e).slice(0, 100)}`);
    }
    return rt.ok(message, `**${member.displayName}:** Added ${emoji ? emoji + ' ' : ''}to ${target.id} with ${role} assigned`);
  },
};
