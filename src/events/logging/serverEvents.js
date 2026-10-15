/**
 * @file serverEvents.js
 * @developer cashholy (carti)
 */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
    AuditLogEvent,
    PermissionFlagsBits
} = require('discord.js');
const { getLogChannel, fetchAuditLogExecutor } = require('./loggingUtils');

async function fetchOverwriteExecutor(guild, channelId, timeWindow = 10000) {
    try {
        const now = Date.now();
        const [updateLogs, createLogs, deleteLogs] = await Promise.all([
            guild.fetchAuditLogs({ type: AuditLogEvent.ChannelOverwriteUpdate, limit: 10 }),
            guild.fetchAuditLogs({ type: AuditLogEvent.ChannelOverwriteCreate, limit: 10 }),
            guild.fetchAuditLogs({ type: AuditLogEvent.ChannelOverwriteDelete, limit: 10 })
        ]);

        const findEntry = (logs) => logs.entries.find(e =>
            (e.extra?.channel?.id === channelId || e.extra?.id === channelId) &&
            (now - e.createdTimestamp) < timeWindow
        );

        return findEntry(updateLogs)?.executor
            || findEntry(createLogs)?.executor
            || findEntry(deleteLogs)?.executor
            || null;
    } catch (error) {
        return null;
    }
}

const PERMISSION_NAMES = {
    [PermissionFlagsBits.CreateInstantInvite]: 'Create Invite',
    [PermissionFlagsBits.KickMembers]: 'Kick Members',
    [PermissionFlagsBits.BanMembers]: 'Ban Members',
    [PermissionFlagsBits.Administrator]: 'Administrator',
    [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
    [PermissionFlagsBits.ManageGuild]: 'Manage Server',
    [PermissionFlagsBits.AddReactions]: 'Add Reactions',
    [PermissionFlagsBits.ViewAuditLog]: 'View Audit Log',
    [PermissionFlagsBits.PrioritySpeaker]: 'Priority Speaker',
    [PermissionFlagsBits.Stream]: 'Video',
    [PermissionFlagsBits.ViewChannel]: 'View Channel',
    [PermissionFlagsBits.SendMessages]: 'Send Messages',
    [PermissionFlagsBits.SendTTSMessages]: 'Send TTS Messages',
    [PermissionFlagsBits.ManageMessages]: 'Manage Messages',
    [PermissionFlagsBits.EmbedLinks]: 'Embed Links',
    [PermissionFlagsBits.AttachFiles]: 'Attach Files',
    [PermissionFlagsBits.ReadMessageHistory]: 'Read Message History',
    [PermissionFlagsBits.MentionEveryone]: 'Mention Everyone',
    [PermissionFlagsBits.UseExternalEmojis]: 'Use External Emojis',
    [PermissionFlagsBits.ViewGuildInsights]: 'View Server Insights',
    [PermissionFlagsBits.Connect]: 'Connect',
    [PermissionFlagsBits.Speak]: 'Speak',
    [PermissionFlagsBits.MuteMembers]: 'Mute Members',
    [PermissionFlagsBits.DeafenMembers]: 'Deafen Members',
    [PermissionFlagsBits.MoveMembers]: 'Move Members',
    [PermissionFlagsBits.UseVAD]: 'Use Voice Activity',
    [PermissionFlagsBits.ChangeNickname]: 'Change Nickname',
    [PermissionFlagsBits.ManageNicknames]: 'Manage Nicknames',
    [PermissionFlagsBits.ManageRoles]: 'Manage Roles',
    [PermissionFlagsBits.ManageWebhooks]: 'Manage Webhooks',
    [PermissionFlagsBits.ManageGuildExpressions]: 'Manage Expressions',
    [PermissionFlagsBits.UseApplicationCommands]: 'Use Application Commands',
    [PermissionFlagsBits.RequestToSpeak]: 'Request to Speak',
    [PermissionFlagsBits.ManageEvents]: 'Manage Events',
    [PermissionFlagsBits.ManageThreads]: 'Manage Threads',
    [PermissionFlagsBits.CreatePublicThreads]: 'Create Public Threads',
    [PermissionFlagsBits.CreatePrivateThreads]: 'Create Private Threads',
    [PermissionFlagsBits.UseExternalStickers]: 'Use External Stickers',
    [PermissionFlagsBits.SendMessagesInThreads]: 'Send Messages in Threads',
    [PermissionFlagsBits.UseEmbeddedActivities]: 'Use Activities',
    [PermissionFlagsBits.ModerateMembers]: 'Timeout Members',
    [PermissionFlagsBits.ViewCreatorMonetizationAnalytics]: 'View Creator Analytics',
    [PermissionFlagsBits.UseSoundboard]: 'Use Soundboard',
    [PermissionFlagsBits.UseExternalSounds]: 'Use External Sounds',
    [PermissionFlagsBits.SendVoiceMessages]: 'Send Voice Messages',
    [PermissionFlagsBits.SendPolls]: 'Send Polls'
};

function getPermissionDifferences(oldPerms, newPerms) {
    const oldBits = BigInt(oldPerms?.bitfield || 0n);
    const newBits = BigInt(newPerms?.bitfield || 0n);

    const added = [];
    const removed = [];

    for (const [bit, name] of Object.entries(PERMISSION_NAMES)) {
        const bitValue = BigInt(bit);
        const hadPerm = (oldBits & bitValue) === bitValue;
        const hasPerm = (newBits & bitValue) === bitValue;

        if (!hadPerm && hasPerm) added.push(name);
        if (hadPerm && !hasPerm) removed.push(name);
    }

    return { added, removed };
}

function getOverwriteChanges(oldOverwrites, newOverwrites, guild) {
    const changes = [];
    const oldMap = new Map(oldOverwrites?.map(o => [o.id, o]) || []);
    const newMap = new Map(newOverwrites?.map(o => [o.id, o]) || []);

    for (const [id, newOverwrite] of newMap) {
        const oldOverwrite = oldMap.get(id);
        const target = guild.roles.cache.get(id) || guild.members.cache.get(id);
        const targetName = target?.name || target?.user?.username || `Unknown (${id})`;
        const targetType = guild.roles.cache.has(id) ? 'Role' : 'Member';

        if (!oldOverwrite) {
            const allowPerms = [];
            const denyPerms = [];
            for (const [bit, name] of Object.entries(PERMISSION_NAMES)) {
                const bitValue = BigInt(bit);
                if ((BigInt(newOverwrite.allow || 0n) & bitValue) === bitValue) allowPerms.push(name);
                if ((BigInt(newOverwrite.deny || 0n) & bitValue) === bitValue) denyPerms.push(name);
            }
            let permText = '';
            if (allowPerms.length > 0) permText += `\n  - Allowed: ${allowPerms.join(', ')}`;
            if (denyPerms.length > 0) permText += `\n  - Denied: ${denyPerms.join(', ')}`;
            if (permText) changes.push(`**${targetType} Added:** ${targetName}${permText}`);
        } else {
            const oldAllow = BigInt(oldOverwrite.allow || 0n);
            const newAllow = BigInt(newOverwrite.allow || 0n);
            const oldDeny = BigInt(oldOverwrite.deny || 0n);
            const newDeny = BigInt(newOverwrite.deny || 0n);

            if (oldAllow !== newAllow || oldDeny !== newDeny) {
                const addedAllow = [];
                const removedAllow = [];
                const addedDeny = [];
                const removedDeny = [];
                const neutral = [];

                for (const [bit, name] of Object.entries(PERMISSION_NAMES)) {
                    const bitValue = BigInt(bit);
                    const wasAllowed = (oldAllow & bitValue) === bitValue;
                    const isAllowed = (newAllow & bitValue) === bitValue;
                    const wasDenied = (oldDeny & bitValue) === bitValue;
                    const isDenied = (newDeny & bitValue) === bitValue;

                    if (!wasAllowed && isAllowed) addedAllow.push(name);
                    if (wasAllowed && !isAllowed && !isDenied) neutral.push(name);
                    if (!wasDenied && isDenied) addedDeny.push(name);
                    if (wasDenied && !isDenied && !isAllowed) neutral.push(name);
                }

                let permText = '';
                if (addedAllow.length > 0) permText += `\n  - Now Allowed: ${addedAllow.join(', ')}`;
                if (addedDeny.length > 0) permText += `\n  - Now Denied: ${addedDeny.join(', ')}`;
                if (neutral.length > 0) permText += `\n  - Set to Neutral: ${neutral.join(', ')}`;
                if (permText) changes.push(`**${targetType} Updated:** ${targetName}${permText}`);
            }
        }
    }

    for (const [id, oldOverwrite] of oldMap) {
        if (!newMap.has(id)) {
            const target = guild.roles.cache.get(id) || guild.members.cache.get(id);
            const targetName = target?.name || target?.user?.username || `Unknown (${id})`;
            const targetType = guild.roles.cache.has(id) ? 'Role' : 'Member';
            changes.push(`**${targetType} Removed:** ${targetName} (all overwrites cleared)`);
        }
    }

    return changes;
}

module.exports = {
    name: 'serverEvents',

    async init(client) {
        client.on('channelCreate', async (channel) => {
            if (!channel.guild) return;
            const logChannel = await getLogChannel(client, channel.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
            const executorText = executor ? `**Created By:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Channel Created')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Channel:** ${channel.name}\n` +
                        `**Type:** \`${channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : channel.type === 4 ? 'Category' : 'Other'}\`\n` +
                        `**ID:** \`${channel.id}\`\n` +
                        executorText +
                        `**Server:** \`${channel.guild.name}\`\n` +
                        `**Server ID:** \`${channel.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('channelDelete', async (channel) => {
            if (!channel.guild) return;
            const logChannel = await getLogChannel(client, channel.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
            const executorText = executor ? `**Deleted By:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Channel Deleted')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Channel:** ${channel.name}\n` +
                        `**Type:** \`${channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : channel.type === 4 ? 'Category' : 'Other'}\`\n` +
                        `**ID:** \`${channel.id}\`\n` +
                        executorText +
                        `**Server:** \`${channel.guild.name}\`\n` +
                        `**Server ID:** \`${channel.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('channelUpdate', async (oldChannel, newChannel) => {
            if (!newChannel.guild) return;
            const logChannel = await getLogChannel(client, newChannel.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const changes = [];
            if (oldChannel.name !== newChannel.name) {
                changes.push(`**Name:** ${oldChannel.name} → ${newChannel.name}`);
            }
            if ((oldChannel.topic || '') !== (newChannel.topic || '')) {
                changes.push(`**Topic:** ${oldChannel.topic || 'None'} → ${newChannel.topic || 'None'}`);
            }
            if (oldChannel.nsfw !== newChannel.nsfw) {
                changes.push(`**NSFW:** ${oldChannel.nsfw} → ${newChannel.nsfw}`);
            }
            if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                changes.push(`**Slowmode:** ${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`);
            }
            if (oldChannel.bitrate !== newChannel.bitrate) {
                changes.push(`**Bitrate:** ${oldChannel.bitrate / 1000}kbps → ${newChannel.bitrate / 1000}kbps`);
            }
            if (oldChannel.userLimit !== newChannel.userLimit) {
                changes.push(`**User Limit:** ${oldChannel.userLimit || 'Unlimited'} → ${newChannel.userLimit || 'Unlimited'}`);
            }
            if (oldChannel.parentId !== newChannel.parentId) {
                const oldParent = oldChannel.parent?.name || 'None';
                const newParent = newChannel.parent?.name || 'None';
                changes.push(`**Category:** ${oldParent} → ${newParent}`);
            }
            if (oldChannel.defaultAutoArchiveDuration !== newChannel.defaultAutoArchiveDuration) {
                const formatDuration = (d) => d ? (d >= 1440 ? `${d / 1440} day(s)` : `${d / 60} hour(s)`) : 'Default';
                changes.push(`**Auto-Archive Duration:** ${formatDuration(oldChannel.defaultAutoArchiveDuration)} → ${formatDuration(newChannel.defaultAutoArchiveDuration)}`);
            }
            if (oldChannel.defaultThreadRateLimitPerUser !== newChannel.defaultThreadRateLimitPerUser) {
                changes.push(`**Default Thread Slowmode:** ${oldChannel.defaultThreadRateLimitPerUser || 0}s → ${newChannel.defaultThreadRateLimitPerUser || 0}s`);
            }
            if (oldChannel.rtcRegion !== newChannel.rtcRegion) {
                changes.push(`**Voice Region:** ${oldChannel.rtcRegion || 'Automatic'} → ${newChannel.rtcRegion || 'Automatic'}`);
            }
            if (oldChannel.videoQualityMode !== newChannel.videoQualityMode) {
                const quality = { 1: 'Auto', 2: 'Full' };
                changes.push(`**Video Quality:** ${quality[oldChannel.videoQualityMode] || 'Auto'} → ${quality[newChannel.videoQualityMode] || 'Auto'}`);
            }

            const oldOverwrites = oldChannel.permissionOverwrites?.cache?.map(o => ({
                id: o.id,
                allow: o.allow.bitfield,
                deny: o.deny.bitfield
            })) || [];
            const newOverwrites = newChannel.permissionOverwrites?.cache?.map(o => ({
                id: o.id,
                allow: o.allow.bitfield,
                deny: o.deny.bitfield
            })) || [];

            const overwriteChanges = getOverwriteChanges(oldOverwrites, newOverwrites, newChannel.guild);
            if (overwriteChanges.length > 0) {
                changes.push(`\n**Permission Overwrites:**`);
                changes.push(...overwriteChanges);
            }

            if (changes.length === 0) return;

            let executor = await fetchAuditLogExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
            if (!executor && overwriteChanges.length > 0) {
                executor = await fetchOverwriteExecutor(newChannel.guild, newChannel.id);
            }
            const executorText = executor ? `**Updated By:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Channel Updated')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Channel:** <#${newChannel.id}>\n` +
                        `**ID:** \`${newChannel.id}\`\n` +
                        executorText +
                        `**Server:** \`${newChannel.guild.name}\`\n` +
                        `**Server ID:** \`${newChannel.guild.id}\`\n\n` +
                        `**Changes:**\n${changes.join('\n')}`
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('roleCreate', async (role) => {
            const logChannel = await getLogChannel(client, role.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
            const executorText = executor ? `**Created By:** <@${executor.id}>\n` : '';

            const permissions = [];
            for (const [bit, name] of Object.entries(PERMISSION_NAMES)) {
                const bitValue = BigInt(bit);
                if ((BigInt(role.permissions.bitfield) & bitValue) === bitValue) {
                    permissions.push(name);
                }
            }
            const permText = permissions.length > 0 ? `**Permissions:** ${permissions.slice(0, 10).join(', ')}${permissions.length > 10 ? ` +${permissions.length - 10} more` : ''}` : '**Permissions:** None';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Role Created')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Role:** ${role.name}\n` +
                        `**Color:** \`${role.hexColor}\`\n` +
                        `**ID:** \`${role.id}\`\n` +
                        `**Hoisted:** \`${role.hoist}\`\n` +
                        `**Mentionable:** \`${role.mentionable}\`\n` +
                        executorText +
                        `${permText}\n` +
                        `**Server:** \`${role.guild.name}\`\n` +
                        `**Server ID:** \`${role.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('roleDelete', async (role) => {
            const logChannel = await getLogChannel(client, role.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
            const executorText = executor ? `**Deleted By:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Role Deleted')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Role:** ${role.name}\n` +
                        `**Color:** \`${role.hexColor}\`\n` +
                        `**ID:** \`${role.id}\`\n` +
                        executorText +
                        `**Server:** \`${role.guild.name}\`\n` +
                        `**Server ID:** \`${role.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('roleUpdate', async (oldRole, newRole) => {
            const logChannel = await getLogChannel(client, newRole.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const changes = [];
            if (oldRole.name !== newRole.name) {
                changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
            }
            if (oldRole.hexColor !== newRole.hexColor) {
                changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
            }
            if (oldRole.hoist !== newRole.hoist) {
                changes.push(`**Hoisted:** ${oldRole.hoist} → ${newRole.hoist}`);
            }
            if (oldRole.mentionable !== newRole.mentionable) {
                changes.push(`**Mentionable:** ${oldRole.mentionable} → ${newRole.mentionable}`);
            }
            if (oldRole.icon !== newRole.icon) {
                changes.push(`**Icon:** Updated`);
            }
            if (oldRole.unicodeEmoji !== newRole.unicodeEmoji) {
                changes.push(`**Emoji:** ${oldRole.unicodeEmoji || 'None'} → ${newRole.unicodeEmoji || 'None'}`);
            }
            if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
                const { added, removed } = getPermissionDifferences(oldRole.permissions, newRole.permissions);
                if (added.length > 0) {
                    changes.push(`**Permissions Added:** ${added.join(', ')}`);
                }
                if (removed.length > 0) {
                    changes.push(`**Permissions Removed:** ${removed.join(', ')}`);
                }
            }

            if (changes.length === 0) return;

            const executor = await fetchAuditLogExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
            const executorText = executor ? `**Updated By:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Role Updated')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Role:** ${newRole.name}\n` +
                        `**ID:** \`${newRole.id}\`\n` +
                        executorText +
                        `**Server:** \`${newRole.guild.name}\`\n` +
                        `**Server ID:** \`${newRole.guild.id}\`\n\n` +
                        `**Changes:**\n${changes.join('\n')}`
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('guildUpdate', async (oldGuild, newGuild) => {
            const logChannel = await getLogChannel(client, newGuild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const changes = [];
            if (oldGuild.name !== newGuild.name) {
                changes.push(`**Name:** ${oldGuild.name} → ${newGuild.name}`);
            }
            if (oldGuild.icon !== newGuild.icon) {
                changes.push(`**Icon:** Updated`);
            }
            if (oldGuild.banner !== newGuild.banner) {
                changes.push(`**Banner:** Updated`);
            }
            if (oldGuild.splash !== newGuild.splash) {
                changes.push(`**Splash:** Updated`);
            }
            if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
                const levels = ['None', 'Low', 'Medium', 'High', 'Very High'];
                changes.push(`**Verification Level:** ${levels[oldGuild.verificationLevel]} → ${levels[newGuild.verificationLevel]}`);
            }
            if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
                const filters = ['Disabled', 'Members Without Roles', 'All Members'];
                changes.push(`**Content Filter:** ${filters[oldGuild.explicitContentFilter]} → ${filters[newGuild.explicitContentFilter]}`);
            }
            if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
                const notifs = ['All Messages', 'Only Mentions'];
                changes.push(`**Default Notifications:** ${notifs[oldGuild.defaultMessageNotifications]} → ${notifs[newGuild.defaultMessageNotifications]}`);
            }
            if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
                const oldAfk = oldGuild.afkChannel?.name || 'None';
                const newAfk = newGuild.afkChannel?.name || 'None';
                changes.push(`**AFK Channel:** ${oldAfk} → ${newAfk}`);
            }
            if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
                changes.push(`**AFK Timeout:** ${oldGuild.afkTimeout / 60}min → ${newGuild.afkTimeout / 60}min`);
            }
            if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
                const oldSys = oldGuild.systemChannel?.name || 'None';
                const newSys = newGuild.systemChannel?.name || 'None';
                changes.push(`**System Channel:** ${oldSys} → ${newSys}`);
            }
            if (oldGuild.rulesChannelId !== newGuild.rulesChannelId) {
                const oldRules = oldGuild.rulesChannel?.name || 'None';
                const newRules = newGuild.rulesChannel?.name || 'None';
                changes.push(`**Rules Channel:** ${oldRules} → ${newRules}`);
            }
            if (oldGuild.description !== newGuild.description) {
                changes.push(`**Description:** ${oldGuild.description || 'None'} → ${newGuild.description || 'None'}`);
            }
            if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
                changes.push(`**Vanity URL:** ${oldGuild.vanityURLCode || 'None'} → ${newGuild.vanityURLCode || 'None'}`);
            }
            if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled) {
                changes.push(`**Boost Progress Bar:** ${oldGuild.premiumProgressBarEnabled} → ${newGuild.premiumProgressBarEnabled}`);
            }

            if (changes.length === 0) return;

            const executor = await fetchAuditLogExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
            const executorText = executor ? `**Updated By:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Server Updated')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Server:** \`${newGuild.name}\`\n` +
                        `**ID:** \`${newGuild.id}\`\n` +
                        executorText + `\n` +
                        `**Changes:**\n${changes.join('\n')}`
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('emojiCreate', async (emoji) => {
            const logChannel = await getLogChannel(client, emoji.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
            const executorText = executor ? `**Created By:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Emoji Created')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Emoji:** ${emoji} \`${emoji.name}\`\n` +
                        `**ID:** \`${emoji.id}\`\n` +
                        `**Animated:** \`${emoji.animated}\`\n` +
                        executorText +
                        `**Server:** \`${emoji.guild.name}\`\n` +
                        `**Server ID:** \`${emoji.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('emojiDelete', async (emoji) => {
            const logChannel = await getLogChannel(client, emoji.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
            const executorText = executor ? `**Deleted By:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Emoji Deleted')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Emoji:** \`${emoji.name}\`\n` +
                        `**ID:** \`${emoji.id}\`\n` +
                        `**Animated:** \`${emoji.animated}\`\n` +
                        executorText +
                        `**Server:** \`${emoji.guild.name}\`\n` +
                        `**Server ID:** \`${emoji.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('stickerCreate', async (sticker) => {
            const logChannel = await getLogChannel(client, sticker.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(sticker.guild, AuditLogEvent.StickerCreate, sticker.id);
            const executorText = executor ? `**Created By:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Sticker Created')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Sticker:** \`${sticker.name}\`\n` +
                        `**ID:** \`${sticker.id}\`\n` +
                        `**Description:** ${sticker.description || 'None'}\n` +
                        `**Tags:** ${sticker.tags || 'None'}\n` +
                        executorText +
                        `**Server:** \`${sticker.guild.name}\`\n` +
                        `**Server ID:** \`${sticker.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });

        client.on('stickerDelete', async (sticker) => {
            const logChannel = await getLogChannel(client, sticker.guild.id, 'serverLogs', 'server');
            if (!logChannel) return;

            const executor = await fetchAuditLogExecutor(sticker.guild, AuditLogEvent.StickerDelete, sticker.id);
            const executorText = executor ? `**Deleted By:** <@${executor.id}>\n` : '';

            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Sticker Deleted')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Sticker:** \`${sticker.name}\`\n` +
                        `**ID:** \`${sticker.id}\`\n` +
                        executorText +
                        `**Server:** \`${sticker.guild.name}\`\n` +
                        `**Server ID:** \`${sticker.guild.id}\``
                    )
                );

            logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { users: [] } }).catch(() => { });
        });
    }
};
