// ─── cashholy (carti) · developer ───

const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const ms = require('ms');

function modReply(message, title, body) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'temprole',
  description: 'Temporarily add roles to users',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(message, 'Permission Denied', 'You need the **Manage Roles** permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(message, 'Missing Permissions', 'I need the **Manage Roles** permission.');

    const targetMember = message.mentions.members.first();
    if (!targetMember)
      return modReply(message, 'User Not Found', 'Please mention a user.');

    const role = message.mentions.roles.first();
    if (!role)
      return modReply(message, 'Role Not Found', 'Please mention a role.');

    const duration = args.find(arg => !arg.startsWith('<@') && !arg.startsWith('<&'));
    if (!duration)
      return modReply(message, 'Missing Duration', 'Please provide a duration (e.g., 1h, 30m, 1d).');

    const time = ms(duration);
    if (!time || time < 1000 || time > 315360000000)
      return modReply(message, 'Invalid Duration', 'Provide a valid duration (e.g., 1h, 30m, 1d, 7d).');

    if (role.position >= message.guild.members.me.roles.highest.position)
      return modReply(message, 'Role Too High', 'I cannot manage this role as it is higher than or equal to my highest role.');

    if (targetMember.roles.cache.has(role.id))
      return modReply(message, 'Role Already Assigned', 'User already has this role.');

    const reason = args.filter(arg => !arg.startsWith('<@') && !arg.startsWith('<&') && arg !== duration).join(' ') || 'No reason provided';

    try {
      await targetMember.roles.add(role, `[TEMPROLE ${ms(time, { long: true })}] ${reason}`);

      setTimeout(async () => {
        try {
          const member = await message.guild.members.fetch(targetMember.id).catch(() => null);
          if (member?.roles.cache.has(role.id)) await member.roles.remove(role, 'Temporary role expired');
        } catch {}
      }, time);

      await modReply(message, 'Temporary Role Added',
        `**User:** ${targetMember.user}\n**Role:** ${role}\n**Duration:** ${ms(time, { long: true })}\n**Added by:** ${message.author.tag}\n**Reason:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to manage this role.' : 'Failed to add temporary role.';
      await modReply(message, 'Error', msg);
    }
  },
};
