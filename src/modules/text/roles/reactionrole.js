// @cashholy(carti) — reactionrole

// hope — reactionrole (rr): reaction roles on any message. Prefix only.
//   rr add <message link | id> <@role> <emoji>
//   rr remove <message link | id> <emoji | @role>
//   rr list          rr reset <message link | id>
// Uses the same ReactionRoles table the reaction handlers already read.

const ui = require('../../../services/ui');
const rt = require('../../../services/roleTools');
const ReactionRoles = require('../../../database/schemas/ReactionRoles');
const { invalidateReactionRoleCache, getPairs } = require('../../../services/reactionRoleHelper');

const HELP = ui.card({
  title: 'Reaction roles',
  lines: [
    '`rr add <message link | id> <@role> <emoji>`',
    '`rr remove <message link | id> <emoji | @role>`',
    '`rr list`',
    '`rr reset <message link | id>`',
  ],
});

const sameEmoji = (a, b) => String(a).trim() === String(b).trim() || (a.match?.(/(\d{15,22})>$/)?.[1] && a.match(/(\d{15,22})>$/)[1] === b.match?.(/(\d{15,22})>$/)?.[1]);

module.exports = {
  name: 'reactionrole',
  description: 'Reaction roles on any message',
  aliases: ['rr'],
  category: 'moderation',

  async execute(message, args) {
    const { guild, member, client } = message;
    if (!member.permissions.has('ManageRoles')) return rt.bad(message, 'Missing **Manage Roles** permission');

    const sub = (args[0] || '').toLowerCase();
    if (!['add', 'remove', 'list', 'reset'].includes(sub)) return rt.send(message, HELP);
    const rest = args.slice(1);

    if (sub === 'list') {
      const rows = await ReactionRoles.findAll({ where: { guildId: guild.id } });
      const lines = rows.filter(r => getPairs(r).length)
        .map(r => `https://discord.com/channels/${guild.id}/${r.channelId}/${r.messageId} — ${getPairs(r).map(p => `${p.emoji} <@&${p.roleId}>`).join(' ')}`);
      return rt.send(message, ui.card({ title: 'Reaction roles', lines: lines.length ? lines.slice(0, 15) : ui.sub('None yet') }));
    }

    const target = await rt.resolveMessage(guild, rest.shift(), message.channel);
    if (!target) return rt.bad(message, 'Message not found — use a message link or id');
    const where = { guildId: guild.id, messageId: target.id };
    let row = await ReactionRoles.findOne({ where });

    if (sub === 'reset') {
      if (!row) return rt.warn(message, 'Nothing set on that message');
      for (const p of getPairs(row)) {
        const r = target.reactions.cache.find(x => sameEmoji(x.emoji.toString(), p.emoji));
        if (r) await r.users.remove(client.user.id).catch(() => {});
      }
      await row.destroy();
      invalidateReactionRoleCache(target.id, guild.id);
      return rt.ok(message, `Reaction roles cleared on ${target.id}`);
    }

    if (sub === 'remove') {
      const tok = rest[0] || '';
      const role = /^<@&\d+>$/.test(tok) ? rt.findRole(guild, tok) : null;
      const pairs = row ? getPairs(row) : [];
      const hit = pairs.find(p => (role ? p.roleId === role.id : sameEmoji(p.emoji, tok)));
      if (!hit) return rt.warn(message, 'No matching reaction role on that message');
      const left = pairs.filter(p => p !== hit);
      const r = target.reactions.cache.find(x => sameEmoji(x.emoji.toString(), hit.emoji));
      if (r) await r.users.remove(client.user.id).catch(() => {});
      if (left.length) await row.update({ emojiRolePairs: left }); else await row.destroy();
      invalidateReactionRoleCache(target.id, guild.id);
      return rt.ok(message, `**${member.displayName}:** Removed ${hit.emoji} from ${target.id} (<@&${hit.roleId}>)`);
    }

    // add
    const role = rt.findRole(guild, rest.shift());
    const blocked = rt.roleBlocked(guild, member, role);
    if (blocked) return rt.bad(message, blocked);
    const emojiTok = rest.shift();
    if (!rt.parseEmojiToken(emojiTok)) return rt.send(message, HELP);

    const perms = target.channel.permissionsFor(guild.members.me);
    if (!perms?.has(['ViewChannel', 'ReadMessageHistory', 'AddReactions'])) return rt.bad(message, `I can't react in ${target.channel}`);

    const pairs = row ? getPairs(row).filter(p => p.roleId !== role.id && !sameEmoji(p.emoji, emojiTok)) : [];
    if (pairs.length >= 20) return rt.warn(message, 'A message holds 20 reactions at most');
    try {
      await target.react(emojiTok.replace(/^<a?:(\w+:\d+)>$/, '$1'));
    } catch (_) {
      return rt.bad(message, 'I can\'t use that emoji');
    }
    pairs.push({ emoji: emojiTok, roleId: role.id, roleLabel: role.name });

    if (row) await row.update({ emojiRolePairs: pairs, enabled: true });
    else row = await ReactionRoles.create({ guildId: guild.id, messageId: target.id, channelId: target.channel.id, emojiRolePairs: pairs });
    invalidateReactionRoleCache(target.id, guild.id);
    return rt.ok(message, `**${member.displayName}:** Added ${emojiTok} to ${target.id} with ${role} assigned`);
  },
};
