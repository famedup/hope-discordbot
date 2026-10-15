// ─── cashholy (carti) · developer ───

// hope — handles clicks on button role panels (custom id `hbr:<roleId>`).

const { MessageFlags } = require('discord.js');
const ui = require('../../services/ui');
const { PREFIX } = require('../../services/buttonRolePanel');

const FLAGS = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;
const NO_PING = { parse: [], roles: [], users: [] };
const reply = (i, c) => i.reply({ components: [c], flags: FLAGS, allowedMentions: NO_PING });

async function handle(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith(PREFIX)) return false;
  const { guild, member } = interaction;
  if (!guild || !member) return true;

  const role = guild.roles.cache.get(interaction.customId.slice(PREFIX.length));
  if (!role) { await reply(interaction, ui.fail('That role no longer exists')); return true; }

  const me = guild.members.me;
  if (role.managed || !me?.permissions.has('ManageRoles') || role.position >= me.roles.highest.position) {
    await reply(interaction, ui.fail('I can\'t manage that role'));
    return true;
  }

  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role, 'Button role');
      await reply(interaction, ui.warn(`Removed ${role}`));
    } else {
      await member.roles.add(role, 'Button role');
      await reply(interaction, ui.success(`Added ${role}`));
    }
  } catch (_) {
    await reply(interaction, ui.fail('Couldn\'t update your roles'));
  }
  return true;
}

module.exports = { handle };
