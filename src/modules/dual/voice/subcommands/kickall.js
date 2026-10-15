// »» engineered by cashholy (carti) ««

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
        if (!botPerms.has(PermissionFlagsBits.MoveMembers)) {
            return reply(interactionOrMessage, 'Missing Permissions', 'I need the **Move Members** permission to disconnect users from voice.');
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

        const members = channel.members.filter(m => !m.user.bot);
        if (members.size === 0) {
            return reply(interactionOrMessage, 'Empty Channel', 'There are no users in that voice channel.');
        }

        let kicked = 0, failed = 0;
        for (const [, member] of members) {
            try { await member.voice.disconnect(); kicked++; }
            catch { failed++; }
        }

        const failText = failed > 0 ? `\n-# ${failed} user${failed !== 1 ? 's' : ''} could not be kicked (higher role or permissions)` : '';
        return reply(interactionOrMessage, 'Voice Kick All', `Kicked **${kicked}** user${kicked !== 1 ? 's' : ''} from **${channel.name}**.${failText}`);
    }
};
