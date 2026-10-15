/** @author cashholy (carti) */

const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');

function modReply(message, title, body) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'roleremove',
  description: 'Remove a role from a user',
  aliases: ['removerole', 'takerole'],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(message, 'Permission Denied', 'You need the **Manage Roles** permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return modReply(message, 'Missing Permissions', 'I need the **Manage Roles** permission.');

    let targetMember = message.mentions.members.first();
    if (!targetMember && args[0]) {
      const userQuery = args[0];
      const userIdMatch = userQuery.match(/^<?@?!?(\d{17,20})>?$/);
      if (userIdMatch) {
        targetMember = await message.guild.members.fetch(userIdMatch[1]).catch(() => null);
      } else {
        targetMember = message.guild.members.cache.find(m => 
          m.user.username.toLowerCase() === userQuery.toLowerCase() ||
          m.displayName.toLowerCase() === userQuery.toLowerCase()
        );
      }
    }
    if (!targetMember)
      return modReply(message, 'User Not Found', 'Please provide a valid user mention, ID, or username.');

    let role = message.mentions.roles.first();
    if (!role && args[1]) {
      const roleQuery = args[1];
      const roleIdMatch = roleQuery.match(/^<?@?&?(\d{17,20})>?$/);
      if (roleIdMatch) {
        role = message.guild.roles.cache.get(roleIdMatch[1]);
      } else {
        role = message.guild.roles.cache.find(r => 
          r.name.toLowerCase() === roleQuery.toLowerCase() ||
          r.name.toLowerCase().includes(roleQuery.toLowerCase())
        );
      }
    }
    if (!role)
      return modReply(message, 'Role Not Found', 'Please provide a valid role mention, ID, or name.');

    if (role.position >= message.guild.members.me.roles.highest.position)
      return modReply(message, 'Role Too High', 'I cannot manage this role as it is higher than or equal to my highest role.');

    if (message.author.id !== message.guild.ownerId && role.position >= message.member.roles.highest.position)
      return modReply(message, 'Role Too High', 'You cannot manage a role higher than or equal to your highest role.');

    if (!targetMember.roles.cache.has(role.id))
      return modReply(message, 'Role Not Found', 'User does not have this role.');

    try {
      await targetMember.roles.remove(role, `[ROLEREMOVE] By ${message.author.tag}`);
      await modReply(message, 'Role Removed',
        `**User:** ${targetMember.user}\n**Role:** ${role.name}\n**Removed by:** ${message.author.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to manage this role.' : 'Failed to remove role.';
      await modReply(message, 'Error', msg);
    }
  },
};
