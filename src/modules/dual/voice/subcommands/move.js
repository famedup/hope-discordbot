/* ---
   author : cashholy (carti)
   module : move
   --- */

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');

function reply(ctx, title, text) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = !!interactionOrMessage.isChatInputCommand;
        const guild = interactionOrMessage.guild;

        const botPerms = guild.members.me.permissions;
        if (!botPerms.has(PermissionFlagsBits.MoveMembers)) {
            return reply(interactionOrMessage, 'Missing Permissions', 'I need the **Move Members** permission to move users between voice channels.');
        }

        let targetUser, channel;
        if (isSlashCommand) {
            targetUser = interactionOrMessage.options.getUser('user');
            channel = interactionOrMessage.options.getChannel('channel');
        } else {
            const userId = args[0]?.replace(/[<@!>]/g, '');
            const channelId = args[1]?.replace(/[<#>]/g, '');

            if (!userId || !channelId) {
                return reply(interactionOrMessage, 'Missing Arguments', 'Please provide a user and destination channel.\n**Usage:** `voice move <user> <channel>`');
            }

            try {
                targetUser = await interactionOrMessage.client.users.fetch(userId);
            } catch {
                return reply(interactionOrMessage, 'Invalid User', 'Could not find that user.');
            }

            channel = guild.channels.cache.get(channelId);
        }

        if (!channel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
            return reply(interactionOrMessage, 'Invalid Channel', 'Please specify a valid voice channel.');
        }

        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!member || !member.voice.channel) {
            return reply(interactionOrMessage, 'Not in Voice', 'That user is not in a voice channel.');
        }

        try {
            await member.voice.setChannel(channel);
            return reply(interactionOrMessage, 'Voice Move', `Moved **${member.user.username}** to **${channel.name}**.`);
        } catch (error) {
            if (error.code === 50013) return reply(interactionOrMessage, 'Missing Permissions', 'I cannot move this user. They may have a higher role or the destination channel restricts access.');
            return reply(interactionOrMessage, 'Error', `Failed to move user: ${error.message}`);
        }
    }
};
