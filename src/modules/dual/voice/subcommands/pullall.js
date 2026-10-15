// ▛▀ cashholy (carti) ▀▜

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
            return reply(interactionOrMessage, 'Missing Permissions', 'I need the **Move Members** permission to pull users.');
        }

        if (!executorMember.voice.channel) {
            return reply(interactionOrMessage, 'Not in Voice', 'You must be in a voice channel to pull users.');
        }

        let sourceChannel;
        if (isSlashCommand) {
            sourceChannel = interactionOrMessage.options.getChannel('channel');
        } else {
            const channelId = args[0]?.replace(/[<#>]/g, '');
            if (!channelId) return reply(interactionOrMessage, 'Missing Channel', 'Please specify a source channel.\n**Usage:** `voice pullall <channel>`');
            sourceChannel = guild.channels.cache.get(channelId);
        }

        if (!sourceChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(sourceChannel.type)) {
            return reply(interactionOrMessage, 'Invalid Channel', 'Please specify a valid voice channel.');
        }

        const members = sourceChannel.members.filter(m => !m.user.bot && m.id !== executorMember.id);
        if (members.size === 0) {
            return reply(interactionOrMessage, 'Empty Channel', 'There are no users in that channel to pull.');
        }

        let pulled = 0, failed = 0;
        for (const [, member] of members) {
            try { await member.voice.setChannel(executorMember.voice.channel); pulled++; }
            catch { failed++; }
        }

        const failText = failed > 0 ? `\n-# ${failed} user${failed !== 1 ? 's' : ''} could not be pulled (higher role or permissions)` : '';
        return reply(interactionOrMessage, 'Voice Pull All', `Pulled **${pulled}** user${pulled !== 1 ? 's' : ''} from **${sourceChannel.name}** to **${executorMember.voice.channel.name}**.${failText}`);
    }
};
