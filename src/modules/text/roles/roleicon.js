// ▛▀ cashholy (carti) ▀▜

// hope — roleicon (ri): set or clear a role's icon. Prefix only.

const ui = require('../../../services/ui');
const rt = require('../../../services/roleTools');

module.exports = {
  name: 'roleicon',
  description: 'Set or remove a role icon',
  aliases: ['ri'],
  category: 'moderation',

  async execute(message, args) {
    const { guild, member } = message;
    if (!member.permissions.has('ManageRoles')) return rt.bad(message, 'Missing **Manage Roles** permission');

    // roleicon <@role|id|name…> <emoji|remove>   (or attach an image)
    const attachment = message.attachments.first();
    const last = args[args.length - 1];
    const wantsRemove = /^(remove|clear|none|reset)$/i.test(last || '');
    const emoji = rt.parseEmojiToken(last);

    const roleArgs = (wantsRemove || emoji) ? args.slice(0, -1) : args;
    const role = rt.findRole(guild, roleArgs.join(' '));

    if (!args.length || (!wantsRemove && !emoji && !attachment))
      return rt.send(message, ui.card({ title: 'Role icon', lines: '`roleicon <role> <emoji>`\n`roleicon <role> remove`\nOr attach an image' }));

    const blocked = rt.roleBlocked(guild, member, role);
    if (blocked) return rt.bad(message, blocked);

    if (!wantsRemove && !guild.features.includes('ROLE_ICONS'))
      return rt.warn(message, 'This server needs **Boost level 2** for role icons');

    try {
      if (wantsRemove) {
        await role.setIcon(null, `Role icon removed by ${message.author.tag}`);
        return rt.ok(message, `**Role Icon Removed** — ${role}`);
      }
      let shown;
      if (emoji?.unicode) { await role.setIcon(emoji.unicode, `Role icon set by ${message.author.tag}`); shown = emoji.unicode; }
      else if (emoji?.custom) { await role.setIcon(emoji.custom.url, `Role icon set by ${message.author.tag}`); shown = last; }
      else {
        if (!/^image\/(png|jpe?g|gif|webp)/i.test(attachment.contentType || '')) return rt.bad(message, 'Attach a PNG, JPG or GIF');
        if (attachment.size > 256 * 1024) return rt.bad(message, 'Image must be under 256 KB');
        await role.setIcon(attachment.url, `Role icon set by ${message.author.tag}`);
        shown = 'image';
      }
      return rt.ok(message, `**Role Icon Set** — ${role} → ${shown}`);
    } catch (e) {
      return rt.bad(message, `Couldn't set the icon: ${String(e.message || e).slice(0, 120)}`);
    }
  },
};
