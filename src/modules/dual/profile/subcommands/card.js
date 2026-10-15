// ▛▀ cashholy (carti) ▀▜

const { AttachmentBuilder } = require('discord.js');
const { Profile } = require('../../../../database/schemas');
const { profileImage } = require('../../../../services/profileCard');
const emojis = require('../../../../media/emojis.json');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const isSlashCommand = interactionOrMessage.isCommand && interactionOrMessage.isCommand();

        let targetUser;
        let reply;

        if (isSlashCommand) {
            await interactionOrMessage.deferReply();
            targetUser = interactionOrMessage.options.getUser('user') || interactionOrMessage.user;
            reply = (content) => interactionOrMessage.editReply(content);
        } else {
            const thinkingMsg = await interactionOrMessage.reply(`${emojis.loading} Loading profile card...`);
            const mentionedUser = interactionOrMessage.mentions.users.first();
            targetUser = mentionedUser || interactionOrMessage.author;
            reply = (content) => thinkingMsg.edit({ content: null, ...content });
        }

        try {
            targetUser = await targetUser.fetch(true);
        } catch {}

        let presenceStatus = 'offline';
        try {
            const guild = interactionOrMessage.guild;
            if (guild) {
                const member = await guild.members.fetch(targetUser.id);
                presenceStatus = member?.presence?.status || 'offline';
            }
        } catch {}

        const userBackground = await Profile.getBackground(targetUser.id);

        let profileCardBuffer;
        try {
            const client = interactionOrMessage.client;
            profileCardBuffer = await profileImage(targetUser, {
                botToken: client.token,
                presenceStatus: presenceStatus,
                customBackground: userBackground || undefined
            });
        } catch (error) {
            console.error('[Profile Card] Error generating profile card:', error);
            return reply({ content: 'Error generating profile card. Please try again.' });
        }

        const attachment = new AttachmentBuilder(profileCardBuffer, { name: 'profile.png' });

        await reply({ files: [attachment] });
    }
};
