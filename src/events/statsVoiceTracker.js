// ─── cashholy (carti) · developer ───

const { Events } = require('discord.js');
const { isPublicChannel } = require('../services/statsScope');
const { bumpVoiceSeconds, todayKey } = require('../database/serverStats');

// userId -> { guildId, joinedAt }
const activeSessions = new Map();

function endSession(userId, guildId) {
    const session = activeSessions.get(userId);
    activeSessions.delete(userId);
    if (!session) return;

    const seconds = Math.round((Date.now() - session.joinedAt) / 1000);
    if (seconds <= 0 || !session.isPublic) return;

    bumpVoiceSeconds(guildId, userId, seconds, todayKey())
        .catch(err => console.error('[StatsVoice] Flush error:', err.message));
}

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const userId = newState.id || oldState.id;
        if (!userId) return;
        const member = newState.member || oldState.member;
        if (member?.user?.bot) return;

        const wasConnected = Boolean(oldState.channelId);
        const isConnected = Boolean(newState.channelId);

        if (!wasConnected && isConnected) {
            // Joined a voice channel.
            activeSessions.set(userId, { guildId: newState.guild.id, joinedAt: Date.now(), isPublic: isPublicChannel(newState.channel) });
        } else if (wasConnected && !isConnected) {
            // Left voice entirely.
            endSession(userId, oldState.guild.id);
        } else if (wasConnected && isConnected && oldState.channelId !== newState.channelId) {
            // Switched channels - close the old session, open a new one.
            endSession(userId, oldState.guild.id);
            activeSessions.set(userId, { guildId: newState.guild.id, joinedAt: Date.now(), isPublic: isPublicChannel(newState.channel) });
        }
        // Mute/deafen-only changes (channelId unchanged) are ignored.
    }
};
