/*! © 2026 cashholy (carti) !*/

// hope — moderation reply helpers (compact result card + author-only undo)

const { MessageFlags } = require('discord.js');
const ui = require('./ui');

const DEFAULT_REASON = 'No reason provided';

const actorOf = (ctx) => ctx.author ?? ctx.user;

/** One short red line. */
function fail(ctx, message) {
  return ui.send(ctx, ui.fail(message), { ephemeral: true });
}

function build(kind, title, line, by, rows = []) {
  return ui.card({ title, lines: line, footer: `by ${by}`, kind, rows });
}

/**
 * Green result card.
 *   done(ctx, { title, target, detail?, reason?, undo? })
 *   undo: { label, title, perm, check?: async (i) => string|null, run: async (i) => void }
 */
async function done(ctx, { title, target, detail, reason, undo }) {
  const actor = actorOf(ctx);
  const parts = [target];
  if (detail) parts.push(detail);
  if (reason && reason !== DEFAULT_REASON) parts.push(reason);
  const line = parts.filter(Boolean).join(' · ');
  const plain = build('success', title, line, actor.tag);

  if (!undo) return ui.send(ctx, plain);

  const id = `modundo_${actor.id}_${Date.now()}`;
  const withBtn = build('success', title, line, actor.tag, [ui.row(ui.btn(id, undo.label, { style: 'secondary' }))]);
  const msg = await ui.send(ctx, withBtn);
  if (!msg || typeof msg.createMessageComponentCollector !== 'function') return msg;

  const col = msg.createMessageComponentCollector({
    filter: (i) => i.customId === id && i.user.id === actor.id,
    time: 120000,
    max: 1,
  });

  col.on('collect', async (i) => {
    try {
      if (!i.memberPermissions?.has(undo.perm) || !i.guild?.members.me?.permissions.has(undo.perm)) {
        return await i.update({ components: [ui.fail('Missing permission')], flags: MessageFlags.IsComponentsV2 });
      }
      const problem = undo.check ? await undo.check(i) : null;
      if (problem) return await i.update({ components: [ui.fail(problem)], flags: MessageFlags.IsComponentsV2 });
      await undo.run(i);
      await i.update({
        components: [build('success', undo.title, line, i.user.tag)],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (_) {
      try { await i.update({ components: [ui.fail('Could not undo')], flags: MessageFlags.IsComponentsV2 }); } catch (__) {}
    }
  });

  col.on('end', async (_c, reason2) => {
    if (reason2 === 'limit') return;
    try { await msg.edit({ components: [plain], flags: MessageFlags.IsComponentsV2 }); } catch (_) {}
  });

  return msg;
}

module.exports = { fail, done, DEFAULT_REASON };
