/*! © 2026 cashholy (carti) !*/

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
        if (!botPerms.has(PermissionFlagsBits.MoveMembers)) {
            return reply(interactionOrMessage, 'Missing Permissions', 'I need the **Move Members** permission to disconnect users from voice.');
        }

        let targetUser;
        if (isSlashCommand) {
            targetUser = interactionOrMessage.options.getUser('user');
        } else {
            const userId = args[0]?.replace(/[<@!>]/g, '');
            if (!userId) return reply(interactionOrMessage, 'Missing User', 'Please mention a user to kick from voice.\n**Usage:** `voice kick <user>`');
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

        try {
            await member.voice.disconnect();
            return reply(interactionOrMessage, 'Voice Kick', `Successfully kicked **${member.user.username}** from voice.`);
        } catch (error) {
            if (error.code === 50013) return reply(interactionOrMessage, 'Missing Permissions', 'I cannot disconnect this user. They may have a higher role than me.');
            return reply(interactionOrMessage, 'Error', `Failed to kick user from voice: ${error.message}`);
        }
    }
};
