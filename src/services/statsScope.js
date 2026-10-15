/*
 * Developed by cashholy (carti)
 * File: services/statsScope.js
 */

// hope — which channels count towards public server stats.
// A channel counts only if @everyone can see it (threads follow their parent;
// private threads never count). Hidden / staff channels stay out of the numbers.

const { PermissionFlagsBits, ChannelType } = require('discord.js');

function isPublicChannel(channel) {
  if (!channel?.guild) return false;
  if (channel.type === ChannelType.PrivateThread) return false;
  const base = channel.isThread?.() ? channel.parent : channel;
  if (!base) return false;
  const everyone = channel.guild.roles.everyone;
  return !!base.permissionsFor(everyone)?.has(PermissionFlagsBits.ViewChannel);
}

/** Ids of every cached channel in the guild that is NOT public. */
function hiddenChannelIds(guild) {
  const out = [];
  for (const ch of guild.channels.cache.values()) {
    if (!isPublicChannel(ch)) out.push(ch.id);
  }
  return out;
}

module.exports = { isPublicChannel, hiddenChannelIds };
