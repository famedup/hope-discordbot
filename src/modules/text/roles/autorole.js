// [dev] cashholy (carti) :: modules/text/roles/autorole.js

// hope — autorole (ar): roles given to new humans / bots. Prefix only.
//   ar humans <@role>        toggle      ar humans add|remove <@role>
//   ar bots <@role>          toggle      ar list      ar reset

const ui = require('../../../services/ui');
const rt = require('../../../services/roleTools');
const AutoRole = require('../../../database/schemas/AutoRole');

const MAX = 5;
const KINDS = { human: 'humans', humans: 'humans', member: 'humans', members: 'humans', bot: 'bots', bots: 'bots' };
const TITLE = { humans: 'Human', bots: 'Bot' };

const HELP = ui.card({
  title: 'Autorole',
  lines: [
    '`ar humans <@role>` · `ar bots <@role>`',
    '`ar humans remove <@role>`',
    '`ar list` · `ar reset`',
    ui.sub('Running the same role twice removes it'),
  ],
});

module.exports = {
  name: 'autorole',
  description: 'Roles given to new members',
  aliases: ['ar'],
  category: 'moderation',

  async execute(message, args) {
    const { guild, member } = message;
    if (!member.permissions.has('ManageRoles') && !member.permissions.has('ManageGuild'))
      return rt.bad(message, 'Missing **Manage Roles** permission');

    const first = (args[0] || '').toLowerCase();

    if (first === 'list' || first === 'config' || first === 'show') {
      const cfg = await AutoRole.read(guild.id);
      const fmt = (ids) => ids.length ? ids.map(id => `<@&${id}>`).join(' ') : ui.sub('none');
      return rt.send(message, ui.card({ title: 'Autorole', lines: [`**Humans** ${fmt(cfg.humans)}`, `**Bots** ${fmt(cfg.bots)}`] }));
    }

    if (first === 'reset' || first === 'clear') {
      await AutoRole.clear(guild.id);
      return rt.ok(message, '**Autorole Reset**');
    }

    const kind = KINDS[first];
    if (!kind) return rt.send(message, HELP);

    const rest = args.slice(1);
    const mode = /^(add|remove|delete|rm)$/i.test(rest[0] || '') ? rest.shift().toLowerCase() : 'toggle';
    const role = rt.findRole(guild, rest.join(' '));
    if (!rest.length) return rt.send(message, HELP);

    const cfg = await AutoRole.read(guild.id);
    const current = cfg[kind].filter(id => guild.roles.cache.has(id));
    const has = current.includes(role?.id);
    const removing = mode === 'remove' || mode === 'delete' || mode === 'rm' || (mode === 'toggle' && has);

    if (!role) return rt.bad(message, 'Role not found');
    if (removing) {
      if (!has) return rt.warn(message, `${role} isn't an autorole for ${kind}`);
      await AutoRole.write(guild.id, { [kind]: current.filter(id => id !== role.id) });
      return rt.ok(message, `**Autorole ${TITLE[kind]} Removed** — ${role}`);
    }

    const blocked = rt.roleBlocked(guild, member, role);
    if (blocked) return rt.bad(message, blocked);
    if (has) return rt.warn(message, `${role} is already an autorole for ${kind}`);
    if (current.length >= MAX) return rt.warn(message, `Up to ${MAX} autoroles per group`);
    await AutoRole.write(guild.id, { [kind]: [...current, role.id] });
    return rt.ok(message, `**Autorole ${TITLE[kind]} Added** — ${role}`);
  },
};
