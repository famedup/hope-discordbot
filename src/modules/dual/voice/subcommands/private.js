//
//  Made with care by cashholy (carti)
//

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
        if (!botPerms.has(PermissionFlagsBits.ManageChannels)) {
            return reply(interactionOrMessage, 'Missing Permissions', 'I need the **Manage Channels** permission to modify voice channel visibility.');
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

        try {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
            return reply(interactionOrMessage, 'Voice Private', `Made **${channel.name}** private. The channel is now hidden.`);
        } catch (error) {
            if (error.code === 50013) return reply(interactionOrMessage, 'Missing Permissions', 'I cannot modify permissions on this channel. Ensure my role is above the channel overrides.');
            return reply(interactionOrMessage, 'Error', `Failed to make channel private: ${error.message}`);
        }
    }
};
