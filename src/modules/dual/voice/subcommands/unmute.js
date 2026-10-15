// »» engineered by cashholy (carti) ««

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
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
        if (!botPerms.has(PermissionFlagsBits.MuteMembers)) {
            return reply(interactionOrMessage, 'Missing Permissions', 'I need the **Mute Members** permission to unmute users.');
        }

        let targetUser;
        if (isSlashCommand) {
            targetUser = interactionOrMessage.options.getUser('user');
        } else {
            const userId = args[0]?.replace(/[<@!>]/g, '');
            if (!userId) return reply(interactionOrMessage, 'Missing User', 'Please mention a user to unmute.\n**Usage:** `voice unmute <user>`');
            try {
                targetUser = await interactionOrMessage.client.users.fetch(userId);
            } catch {
                return reply(interactionOrMessage, 'Invalid User', 'Could not find that user.');
            }
        }

        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!member || !member.voice.channel) {
            return reply(interactionOrMessage, 'Not in Voice', 'That user is not in a voice channel.');
        }

        if (!member.voice.serverMute) {
            return reply(interactionOrMessage, 'Not Muted', 'That user is not server muted.');
        }

        try {
            await member.voice.setMute(false);
            return reply(interactionOrMessage, 'Voice Unmute', `Successfully unmuted **${member.user.username}** in voice.`);
        } catch (error) {
            if (error.code === 50013) return reply(interactionOrMessage, 'Missing Permissions', 'I cannot unmute this user. They may have a higher role than me.');
            return reply(interactionOrMessage, 'Error', `Failed to unmute user: ${error.message}`);
        }
    }
};
