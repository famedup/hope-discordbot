// »» engineered by cashholy (carti) ««

// hope — massrole (mr): give or take a role from humans / bots / everyone. Prefix only.
//   massrole humans @role      massrole remove bots @role

const ui = require('../../../services/ui');
const rt = require('../../../services/roleTools');

const running = new Set(); // one job per guild

const GROUPS = {
  humans: { label: 'humans', test: m => !m.user.bot },
  bots:   { label: 'bots',   test: m => m.user.bot },
  all:    { label: 'everyone', test: () => true },
};

module.exports = {
  name: 'massrole',
  description: 'Give or remove a role from humans, bots or everyone',
  aliases: ['mr'],
  category: 'moderation',

  async execute(message, args) {
    const { guild, member, author } = message;
    if (!member.permissions.has('ManageRoles')) return rt.bad(message, 'Missing **Manage Roles** permission');

    let remove = false;
    const a = [...args];
    if (/^(add|remove|take)$/i.test(a[0] || '')) remove = /^(remove|take)$/i.test(a.shift());

    const groupKey = (a.shift() || '').toLowerCase().replace(/^human$/, 'humans').replace(/^bot$/, 'bots').replace(/^everyone$/, 'all');
    const group = GROUPS[groupKey];
    if (!group || !a.length)
      return rt.send(message, ui.card({ title: 'Mass role', lines: '`massrole humans <role>`\n`massrole bots <role>`\n`massrole all <role>`\nAdd `remove` first to take it away' }));

    const role = rt.findRole(guild, a.join(' '));
    const blocked = rt.roleBlocked(guild, member, role);
    if (blocked) return rt.bad(message, blocked);
    if (running.has(guild.id)) return rt.warn(message, 'A mass role job is already running here');

    // 1 — confirmation
    const id = `mr_${message.id}`;
    const verb = remove ? 'Remove' : 'Give';
    const confirm = ui.box('warning')
      .addTextDisplayComponents(ui.text(`**${verb} ${role} ${remove ? 'from' : 'to'} all ${group.label}?**\n${ui.sub('Runs in the background · no one is pinged')}`))
      .addActionRowComponents(ui.confirmRow(id, { yes: 'Confirm', no: 'Cancel', danger: remove }));
    const prompt = await rt.send(message, confirm);

    let click;
    try {
      click = await prompt.awaitMessageComponent({
        filter: async (i) => {
          if (i.user.id === author.id && i.customId.startsWith(id)) return true;
          try { await i.reply({ components: [ui.fail('Not your menu')], flags: 32768 | 64, allowedMentions: rt.NO_PING }); } catch (_) {}
          return false;
        },
        time: 30000,
      });
    } catch (_) {
      return prompt.edit({ components: [ui.info('Timed out')], flags: 32768, allowedMentions: rt.NO_PING }).catch(() => {});
    }

    if (click.customId === `${id}_no`)
      return click.update({ components: [ui.info('Cancelled')], flags: 32768, allowedMentions: rt.NO_PING }).catch(() => {});

    // 2 — run
    running.add(guild.id);
    try {
      await click.update({
        components: [ui.info(`${ui.emojis.loading ? ui.emojis.loading + ' ' : ''}Confirmed — starting to ${remove ? 'remove' : 'add'} ${role}…`)],
        flags: 32768, allowedMentions: rt.NO_PING,
      });

      let members;
      try { members = await guild.members.fetch(); } catch (_) { members = guild.members.cache; }
      const targets = [...members.values()].filter(m => group.test(m) && (remove ? m.roles.cache.has(role.id) : !m.roles.cache.has(role.id)));

      let done = 0, failed = 0, tick = Date.now();
      for (const m of targets) {
        try {
          if (remove) await m.roles.remove(role, `massrole by ${author.tag}`);
          else await m.roles.add(role, `massrole by ${author.tag}`);
          done++;
        } catch (_) { failed++; }
        if (Date.now() - tick > 8000) {
          tick = Date.now();
          prompt.edit({ components: [ui.info(`${done + failed}/${targets.length} — ${role}`)], flags: 32768, allowedMentions: rt.NO_PING }).catch(() => {});
        }
      }

      const line = `**Updated ${done} member(s)** with ${role}.` + (failed ? `\n${ui.sub(`${failed} failed`)}` : '') + (!targets.length ? `\n${ui.sub('Nobody needed changes')}` : '');
      await prompt.edit({ components: [failed && !done ? ui.fail(line) : ui.success(line)], flags: 32768, allowedMentions: rt.NO_PING }).catch(() => {});
    } finally {
      running.delete(guild.id);
    }
  },
};
