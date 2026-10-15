/*! © 2026 cashholy (carti) !*/

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

        let fromChannel, toChannel;
        if (isSlashCommand) {
            fromChannel = interactionOrMessage.options.getChannel('from');
            toChannel = interactionOrMessage.options.getChannel('to');
        } else {
            const fromId = args[0]?.replace(/[<#>]/g, '');
            const toId = args[1]?.replace(/[<#>]/g, '');

            if (!fromId || !toId) {
                return reply(interactionOrMessage, 'Missing Arguments', 'Please provide source and destination channels.\n**Usage:** `voice moveall <from> <to>`');
            }

            fromChannel = guild.channels.cache.get(fromId);
            toChannel = guild.channels.cache.get(toId);
        }

        if (!fromChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(fromChannel.type)) {
            return reply(interactionOrMessage, 'Invalid Source Channel', 'Please specify a valid source voice channel.');
        }

        if (!toChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(toChannel.type)) {
            return reply(interactionOrMessage, 'Invalid Destination Channel', 'Please specify a valid destination voice channel.');
        }

        const members = fromChannel.members.filter(m => !m.user.bot);
        if (members.size === 0) {
            return reply(interactionOrMessage, 'Empty Channel', 'There are no users in the source channel.');
        }

        let moved = 0, failed = 0;
        for (const [, member] of members) {
            try { await member.voice.setChannel(toChannel); moved++; }
            catch { failed++; }
        }

        const failText = failed > 0 ? `\n-# ${failed} user${failed !== 1 ? 's' : ''} could not be moved (higher role or permissions)` : '';
        return reply(interactionOrMessage, 'Voice Move All', `Moved **${moved}** user${moved !== 1 ? 's' : ''} from **${fromChannel.name}** to **${toChannel.name}**.${failText}`);
    }
};
