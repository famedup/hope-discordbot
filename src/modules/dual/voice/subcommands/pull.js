// ─── cashholy (carti) · developer ───

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
        const executorMember = interactionOrMessage.member;

        const botPerms = guild.members.me.permissions;
        if (!botPerms.has(PermissionFlagsBits.MoveMembers)) {
            return reply(interactionOrMessage, 'Missing Permissions', 'I need the **Move Members** permission to pull users.');
        }

        if (!executorMember.voice.channel) {
            return reply(interactionOrMessage, 'Not in Voice', 'You must be in a voice channel to pull users.');
        }

        let targetUser;
        if (isSlashCommand) {
            targetUser = interactionOrMessage.options.getUser('user');
        } else {
            const userId = args[0]?.replace(/[<@!>]/g, '');
            if (!userId) return reply(interactionOrMessage, 'Missing User', 'Please mention a user to pull.\n**Usage:** `voice pull <user>`');
            try {
                targetUser = await interactionOrMessage.client.users.fetch(userId);
            } catch {
                return reply(interactionOrMessage, 'Invalid User', 'Could not find that user.');
            }
        }

        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!member || !member.voice.channel) {
            return reply(interactionOrMessage, 'User Not in Voice', 'That user is not in a voice channel.');
        }

        try {
            await member.voice.setChannel(executorMember.voice.channel);
            return reply(interactionOrMessage, 'Voice Pull', `Pulled **${member.user.username}** to **${executorMember.voice.channel.name}**.`);
        } catch (error) {
            if (error.code === 50013) return reply(interactionOrMessage, 'Missing Permissions', 'I cannot move this user. They may have a higher role than me.');
            return reply(interactionOrMessage, 'Error', `Failed to pull user: ${error.message}`);
        }
    }
};
