/**
 * @file buttonRolePanel.js
 * @developer cashholy (carti)
 */

// hope — button role panel: build / read / save. State lives in the message
// itself (button custom ids are `hbr:<roleId>`), so no database is needed.

const { MessageFlags } = require('discord.js');
const ui = require('./ui');

const PREFIX = 'hbr:';
const MAX = 25;

/** Read a panel out of a fetched message → { title, items } or null. */
function parsePanel(msg, botId) {
  if (!msg || msg.author?.id !== botId) return null;
  const items = [];
  let title = 'Roles';
  let found = false;
  const walk = (c) => {
    for (const comp of c.components ?? []) {
      if (comp.customId?.startsWith(PREFIX)) {
        found = true;
        items.push({ roleId: comp.customId.slice(PREFIX.length), label: comp.label || '', emoji: comp.emoji ? (comp.emoji.id ? `<${comp.emoji.animated ? 'a' : ''}:${comp.emoji.name}:${comp.emoji.id}>` : comp.emoji.name) : '' });
      } else if (comp.content && /^### /.test(comp.content) && title === 'Roles') {
        title = comp.content.replace(/^### /, '');
      }
      if (comp.components) walk(comp);
    }
  };
  for (const top of msg.components ?? []) walk(top);
  return found ? { title, items } : null;
}

/** Newest panel in a channel (looks at the last 50 messages). */
async function findPanel(channel, botId) {
  const msgs = await channel.messages.fetch({ limit: 50 });
  for (const m of msgs.values()) {
    const p = parsePanel(m, botId);
    if (p) return { message: m, panel: p };
  }
  return null;
}

/** Panel model → container. */
function build({ title, items }) {
  const box = ui.box().addTextDisplayComponents(ui.text(`### ${title}`));
  if (!items.length) {
    box.addTextDisplayComponents(ui.text(ui.sub('No roles yet')));
    return box;
  }
  box.addSeparatorComponents(ui.sep());
  box.addTextDisplayComponents(ui.text(items.map(i => `${i.emoji ? i.emoji + ' ' : ''}**${i.label || 'Role'}** — <@&${i.roleId}>`).join('\n')));
  box.addSeparatorComponents(ui.sep());
  for (let n = 0; n < items.length; n += 5) {
    box.addActionRowComponents(ui.row(items.slice(n, n + 5).map(i =>
      ui.btn(`${PREFIX}${i.roleId}`, i.label || 'Role', { emoji: i.emoji || undefined }))));
  }
  return box;
}

const payload = (model) => ({ components: [build(model)], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [], roles: [], users: [] } });

module.exports = { PREFIX, MAX, parsePanel, findPanel, build, payload };
