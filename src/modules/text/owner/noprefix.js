// ─── cashholy (carti) · developer ───

// hope — noprefix (nop)
// Owner command: let trusted users run commands without the prefix.
//
//   noprefix add <@user/ID> <plan>     plans: 1d · 1m (30 days) · 1y (365 days) · permanent
//   noprefix remove <@user/ID>
//   noprefix list

const {
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, MessageFlags,
} = require('discord.js');
const { NoPrefix } = require('../../../database/schemas');
const config = require('../../../settings');
const emojis = require('../../../media/emojis.json');

// Image shown on the right of the "added" card. Leave null to show the user's avatar,
// or set it to any image URL (for example your own emoji: https://cdn.discordapp.com/emojis/<id>.png).
const THUMBNAIL_URL = null;

const DAY = 86400000;
/** plan → length in ms (null = never expires) */
const PLANS = { '1d': DAY, '1m': 30 * DAY, '1y': 365 * DAY, permanent: null };
const PLAN_LABEL = { '1d': '1 day', '1m': '1 month', '1y': '1 year', permanent: 'permanent' };

const planOf = (input) => {
  const key = String(input || '').toLowerCase().replace(/^perm$/, 'permanent');
  return Object.hasOwn(PLANS, key) ? key : null;
};

const text = (content) => new TextDisplayBuilder().setContent(content);
const stamp = (date, style) => `<t:${Math.floor(new Date(date).getTime() / 1000)}:${style}>`;
const send = (message, container) => message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

/** **Title** · blank line · body · optional thumbnail on the right. */
function card(title, body, thumbnail) {
  const content = text(`**${title}**\n\n${body}`);
  const container = new ContainerBuilder();
  if (thumbnail) {
    container.addSectionComponents(
      new SectionBuilder().addTextDisplayComponents(content).setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail))
    );
  } else {
    container.addTextDisplayComponents(content);
  }
  return container;
}

/** Quiet card: **Title**, small grey caption, then plain lines. */
function quiet(title, caption, lines = []) {
  const parts = [`**${title}**`];
  if (caption) parts.push(`-# ${caption}`);
  if (lines.length) parts.push('', ...lines);
  return new ContainerBuilder().addTextDisplayComponents(text(parts.join('\n')));
}

const fail = (message, body) => send(message, quiet('No-Prefix', null, [`${emojis.error} ${body}`]));

module.exports = {
  name: 'noprefix',
  description: 'Add or remove a user from the no-prefix system',
  usage: 'noprefix add <user> <1d|1m|1y|permanent> | noprefix remove <user> | noprefix list',
  category: 'owner',
  aliases: ['nop'],
  ownerOnly: true,

  async execute(message, args) {
    const action = args[0]?.toLowerCase();
    const findUser = () => message.mentions.users.first() || message.client.users.fetch(args[1]).catch(() => null);

    if (action === 'add') {
      const user = await findUser();
      if (!user) return fail(message, 'Mention a user or give a valid user ID.');

      const plan = planOf(args[2]);
      if (!plan) return fail(message, 'Pick a plan: `1d`, `1m`, `1y` or `permanent`.');

      const expiresAt = PLANS[plan] ? new Date(Date.now() + PLANS[plan]) : null;

      await NoPrefix.upsert({
        userId: user.id,
        username: user.username,
        grantedBy: message.author.id,
        grantedByUsername: message.author.username,
        expiresAt,
        duration: plan,
      });

      const until = expiresAt ? `until ${stamp(expiresAt, 'F')}` : 'permanently';
      return send(message, card(
        'No-Prefix Added',
        `${emojis.success} Granted No-Prefix to <@${user.id}> ${until}`,
        THUMBNAIL_URL || user.displayAvatarURL({ size: 256 }),
      ));
    }

    if (action === 'remove') {
      const user = await findUser();
      const userId = user?.id ?? args[1];
      const removed = userId ? await NoPrefix.destroy({ where: { userId } }) : 0;
      const who = user ? `<@${user.id}>` : `\`${userId}\``;

      if (!removed) return fail(message, `${who} isn't on the list.`);
      return send(message, quiet('No-Prefix Removed', null, [`${emojis.success} ${who}`]));
    }

    if (action === 'list') {
      const records = await NoPrefix.findAll();
      if (!records.length) return send(message, quiet('No-Prefix', 'nobody yet'));

      const lines = records.slice(0, 25).map(r => {
        const plan = planOf(r.duration);
        const label = plan ? PLAN_LABEL[plan] : null;
        const ends = r.expiresAt ? stamp(r.expiresAt, 'R') : 'permanent';
        return `<@${r.userId}> · ${label && r.expiresAt ? `${label} · ends ${ends}` : ends}`;
      });
      if (records.length > 25) lines.push(`-# +${records.length - 25} more`);

      return send(message, quiet('No-Prefix', `${records.length} ${records.length === 1 ? 'user' : 'users'}`, lines));
    }

    return send(message, quiet('No-Prefix', 'plans: 1d · 1m · 1y · permanent', [
      `\`${config.PREFIX} noprefix add <@user/ID> <plan>\``,
      `\`${config.PREFIX} noprefix remove <@user/ID>\``,
      `\`${config.PREFIX} noprefix list\``,
    ]));
  },
};
