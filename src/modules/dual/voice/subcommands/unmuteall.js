// [dev] cashholy (carti) :: modules/dual/voice/subcommands/unmuteall.js

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
        const executorMember = interactionOrMessage.member;

        const botPerms = guild.members.me.permissions;
        if (!botPerms.has(PermissionFlagsBits.MuteMembers)) {
            return reply(interactionOrMessage, 'Missing Permissions', 'I need the **Mute Members** permission to unmute users.');
        }

        let channel;
        if (isSlashCommand) {
            channel = interactionOrMessage.options.getChannel('channel') || executorMember.voice.channel;
        } else {
            const channelId = args[0]?.replace(/[<#>]/g, '');
            channel = channelId ? guild.channels.cache.get(channelId) : executorMember.voice.channel;
        }

        if (!channel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
            return reply(interactionOrMessage, 'Invalid Channel', 'Please specify a valid voice channel or join one.');
        }

        const members = channel.members.filter(m => !m.user.bot && m.voice.serverMute);
        if (members.size === 0) {
            return reply(interactionOrMessage, 'No Users to Unmute', 'There are no muted users in that channel.');
        }

        let unmuted = 0, failed = 0;
        for (const [, member] of members) {
            try { await member.voice.setMute(false); unmuted++; }
            catch { failed++; }
        }

        const failText = failed > 0 ? `\n-# ${failed} user${failed !== 1 ? 's' : ''} could not be unmuted (higher role or permissions)` : '';
        return reply(interactionOrMessage, 'Voice Unmute All', `Unmuted **${unmuted}** user${unmuted !== 1 ? 's' : ''} in **${channel.name}**.${failText}`);
    }
};
