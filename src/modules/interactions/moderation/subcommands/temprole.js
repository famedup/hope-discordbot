//
//  Made with care by cashholy (carti)
//

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const ms = require('ms');

function modReply(interaction, title, body, ephemeral = false) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral });
}

module.exports = {
  name: 'temprole',
  description: 'Temporarily add roles to users',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(interaction, 'Permission Denied', 'You need the **Manage Roles** permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(interaction, 'Missing Permissions', 'I need the **Manage Roles** permission.', true);

    if (!targetMember)
      return modReply(interaction, 'User Not Found', 'User is not in this server.', true);

    const time = ms(duration);
    if (!time || time < 1000 || time > 315360000000)
      return modReply(interaction, 'Invalid Duration', 'Provide a valid duration (e.g., 1h, 30m, 1d, 7d).', true);

    if (role.position >= interaction.guild.members.me.roles.highest.position)
      return modReply(interaction, 'Role Too High', 'I cannot manage this role as it is higher than or equal to my highest role.', true);

    if (targetMember.roles.cache.has(role.id))
      return modReply(interaction, 'Role Already Assigned', 'User already has this role.', true);

    try {
      await targetMember.roles.add(role, `[TEMPROLE ${ms(time, { long: true })}] ${reason}`);

      setTimeout(async () => {
        try {
          const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
          if (member?.roles.cache.has(role.id)) {
            await member.roles.remove(role, 'Temporary role expired');
          }
        } catch {}
      }, time);

      await modReply(interaction, 'Temporary Role Added',
        `**User:** ${targetUser}\n**Role:** ${role}\n**Duration:** ${ms(time, { long: true })}\n**Added by:** ${interaction.user.tag}\n**Reason:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to manage this role.' : 'Failed to add temporary role.';
      await modReply(interaction, 'Error', msg, true);
    }
  },
};
