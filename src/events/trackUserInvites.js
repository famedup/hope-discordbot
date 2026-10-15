/*
 * Developed by cashholy (carti)
 * File: events/trackUserInvites.js
 */

const { Events } = require('discord.js');
const { addInviteUse } = require('../database/userStats');

const inviteCache = new Map();

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            const guild = member.guild;

            try {
                const currentInvites = await guild.invites.fetch();
                const cachedInvites = inviteCache.get(guild.id);

                if (!cachedInvites) {
                    const snapshot = new Map();
                    for (const [code, invite] of currentInvites) {
                        snapshot.set(code, invite.uses);
                    }
                    inviteCache.set(guild.id, snapshot);
                    return;
                }

                let usedInvite = null;
                for (const [code, invite] of currentInvites) {
                    const cachedUses = cachedInvites.get(code) ?? 0;
                    if (invite.uses > cachedUses && invite.inviter) {
                        usedInvite = invite;
                        break;
                    }
                }

                const newSnapshot = new Map();
                for (const [code, invite] of currentInvites) {
                    newSnapshot.set(code, invite.uses);
                }
                inviteCache.set(guild.id, newSnapshot);

                if (usedInvite) {
                    await addInviteUse(usedInvite.inviter.id, guild.id, usedInvite.code);
                }
            } catch (error) {
                console.error('[TRACK INVITES] Failed to fetch invites:', error.message);
            }

        } catch (error) {
            console.error('[TRACK INVITES] Error:', error);
        }
    }
};
