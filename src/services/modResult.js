// »» engineered by cashholy (carti) ««

// hope — shared moderation result card
//
// One compact green line ("Banned **user** · reason") with `-# by moderator`,
// plus an optional author-only undo button that runs the existing reverse action.

const { MessageFlags } = require('discord.js');
const ui = require('./ui');

const UNDO_TIME = 120000;

/**
 * modResult(ctx, moderator, { line, note, undo })
 *   ctx        Message or Interaction to reply to
 *   moderator  User who ran the command
 *   line       result text (target + reason)
 *   note       optional extra for the small footer line
 *   undo       optional { label, permission, permName, done, run(guild, actorMember) }
 *              run() returns a string to report a soft failure, nothing on success
 */
async function modResult(ctx, moderator, { line, note, undo } = {}) {
  const footer = `by ${moderator.tag}${note ? ` · ${note}` : ''}`;
  const id = `modundo_${moderator.id}_${Date.now()}`;
  const build = (withButton) => {
    const c = ui.success(line, { footer });
    if (undo && withButton) c.spliceComponents(1, 0, ui.row(ui.btn(id, undo.label)));
    return c;
  };

  const msg = await ui.send(ctx, build(Boolean(undo)));
  if (!undo || !msg?.createMessageComponentCollector) return msg;

  const reply = (i, container) => i.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
  const col = msg.createMessageComponentCollector({
    filter: (i) => i.customId === id && ui.onlyUser(moderator.id)(i),
    max: 1,
    time: UNDO_TIME,
  });

  col.on('collect', async (i) => {
    try {
      if (!i.memberPermissions?.has(undo.permission))
        return await reply(i, ui.fail(`Missing **${undo.permName}** permission`));
      if (!i.guild.members.me.permissions.has(undo.permission))
        return await reply(i, ui.fail(`I need **${undo.permName}** permission`));
      const problem = await undo.run(i.guild, i.member);
      if (problem) return await reply(i, ui.fail(problem));
      await reply(i, ui.success(undo.done, { footer: `by ${i.user.tag}` }));
    } catch (error) {
      const text = error?.code === 50013 ? 'I lack the permissions to do that' : `Failed to ${undo.label.toLowerCase()}`;
      try { await reply(i, ui.fail(text)); } catch (_) {}
    }
  });

  col.on('end', async (collected) => {
    if (collected.size) return;
    try { await msg.edit({ components: [build(false)], flags: MessageFlags.IsComponentsV2 }); } catch (_) {}
  });

  return msg;
}

module.exports = { modResult };
