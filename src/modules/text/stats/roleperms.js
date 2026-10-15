// »» engineered by cashholy (carti) ««

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');

const permissionNames = {
  [PermissionFlagsBits.Administrator]: 'Administrator',
  [PermissionFlagsBits.ManageGuild]: 'Manage Server',
  [PermissionFlagsBits.ManageRoles]: 'Manage Roles',
  [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
  [PermissionFlagsBits.KickMembers]: 'Kick Members',
  [PermissionFlagsBits.BanMembers]: 'Ban Members',
  [PermissionFlagsBits.CreateInstantInvite]: 'Create Invite',
  [PermissionFlagsBits.ChangeNickname]: 'Change Nickname',
  [PermissionFlagsBits.ManageNicknames]: 'Manage Nicknames',
  [PermissionFlagsBits.ManageEmojisAndStickers]: 'Manage Emojis and Stickers',
  [PermissionFlagsBits.ManageWebhooks]: 'Manage Webhooks',
  [PermissionFlagsBits.ViewChannel]: 'View Channels',
  [PermissionFlagsBits.SendMessages]: 'Send Messages',
  [PermissionFlagsBits.SendMessagesInThreads]: 'Send Messages in Threads',
  [PermissionFlagsBits.CreatePublicThreads]: 'Create Public Threads',
  [PermissionFlagsBits.CreatePrivateThreads]: 'Create Private Threads',
  [PermissionFlagsBits.EmbedLinks]: 'Embed Links',
  [PermissionFlagsBits.AttachFiles]: 'Attach Files',
  [PermissionFlagsBits.AddReactions]: 'Add Reactions',
  [PermissionFlagsBits.UseExternalEmojis]: 'Use External Emojis',
  [PermissionFlagsBits.UseExternalStickers]: 'Use External Stickers',
  [PermissionFlagsBits.MentionEveryone]: 'Mention Everyone',
  [PermissionFlagsBits.ManageMessages]: 'Manage Messages',
  [PermissionFlagsBits.ManageThreads]: 'Manage Threads',
  [PermissionFlagsBits.ReadMessageHistory]: 'Read Message History',
  [PermissionFlagsBits.SendTTSMessages]: 'Send TTS Messages',
  [PermissionFlagsBits.UseApplicationCommands]: 'Use Application Commands',
  [PermissionFlagsBits.Connect]: 'Connect',
  [PermissionFlagsBits.Speak]: 'Speak',
  [PermissionFlagsBits.Stream]: 'Video',
  [PermissionFlagsBits.MuteMembers]: 'Mute Members',
  [PermissionFlagsBits.DeafenMembers]: 'Deafen Members',
  [PermissionFlagsBits.MoveMembers]: 'Move Members',
  [PermissionFlagsBits.UseVAD]: 'Use Voice Activity',
  [PermissionFlagsBits.PrioritySpeaker]: 'Priority Speaker',
  [PermissionFlagsBits.ViewGuildInsights]: 'View Server Insights',
  [PermissionFlagsBits.ModerateMembers]: 'Timeout Members',
};

module.exports = {
  name: 'roleperms',
  description: 'Show all permissions that a specific role has',
  usage: 'roleperms <role>',
  category: 'stats',
  
  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Please provide a role mention, ID, or name.');
    }

    let role = message.mentions.roles.first();
    
    if (!role) {
      const roleQuery = args.join(' ');
      role = message.guild.roles.cache.find(r => 
        r.id === roleQuery || r.name.toLowerCase() === roleQuery.toLowerCase()
      );
    }

    if (!role) {
      return message.reply('Could not find that role.');
    }

    const permissions = role.permissions;

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Permissions for ${role.name}**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    if (permissions.has(PermissionFlagsBits.Administrator)) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Administrator** - All Permissions')
      );
    } else {
      const grantedPerms = [];
      for (const [flag, name] of Object.entries(permissionNames)) {
        if (permissions.has(BigInt(flag))) {
          grantedPerms.push(name);
        }
      }

      if (grantedPerms.length === 0) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('No permissions granted to this role.')
        );
      } else {
        const permList = grantedPerms.map(p => `- ${p}`).join('\n');
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(permList)
        );
      }
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Total Permissions:** ${permissions.toArray().length}`)
    );

    await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
