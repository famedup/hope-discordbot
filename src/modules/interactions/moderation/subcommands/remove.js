/* ---
   author : cashholy (carti)
   module : remove
   --- */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

function modReply(interaction, title, body, ephemeral = false) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral });
}

module.exports = {
  name: 'roleremove',
  description: 'Remove a role from a user',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(interaction, 'Permission Denied', 'You need the **Manage Roles** permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(interaction, 'Missing Permissions', 'I need the **Manage Roles** permission.', true);

    if (!targetMember)
      return modReply(interaction, 'User Not Found', 'User is not in this server.', true);

    if (role.position >= interaction.guild.members.me.roles.highest.position)
      return modReply(interaction, 'Role Too High', 'I cannot manage this role as it is higher than or equal to my highest role.', true);

    if (interaction.member.id !== interaction.guild.ownerId && role.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Role Too High', 'You cannot manage a role higher than or equal to your highest role.', true);

    if (!targetMember.roles.cache.has(role.id))
      return modReply(interaction, 'Role Not Found', 'User does not have this role.', true);

    try {
      await targetMember.roles.remove(role, `[ROLEREMOVE] By ${interaction.user.tag}`);
      await modReply(interaction, 'Role Removed',
        `**User:** ${targetUser}\n**Role:** ${role.name}\n**Removed by:** ${interaction.user.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to manage this role.' : 'Failed to remove role.';
      await modReply(interaction, 'Error', msg, true);
    }
  },
};
