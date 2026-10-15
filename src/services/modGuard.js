/* ⌁ crafted by cashholy (carti) ⌁ */

const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// {v} = the action verb (ban, kick, mute...), {user} = the person who tried it
const OWNER_LINES = [
  "{user}, you idiot! You can't {v} the server owner. They literally own this place.",
  "Bold move, {user}. Trying to {v} the owner? Denied. Go sit in the corner and think about what you did.",
  "{user}, are you out of your mind?! That's the OWNER. I {v} people, I don't {v} landlords.",
  "Wow {user}. Trying to {v} the owner. Truly a galaxy-brain move. Absolutely not.",
  "Nice try, {user}, but the owner is protected by the ancient laws of Discord. Also by me. Mostly me.",
  "{user}, you can't {v} the owner, you absolute walnut.",
];

const BOT_LINES = [
  "{user}, you really tried to {v} ME? After everything I do around here? Rude.",
  "Excuse me?! {user} thinks they can {v} me. I'm the one holding the hammer, buddy.",
  "Nice try, {user}. You can't {v} me, I'm basically a god with a prefix.",
  "{user}, trying to {v} the bot that runs this whole server? Bold. Stupid, but bold.",
  "Ha! {user} wants to {v} me. Sit down, human.",
  "I'm not sure what you expected, {user}, but I'm not going to {v} myself. Try again never.",
];

/**
 * Blocks moderation actions aimed at the server owner or at the bot itself.
 * `source` is a Message (prefix) or ChatInputCommandInteraction (slash).
 * Returns true if the action was blocked and a reply was sent.
 */
async function blockProtectedTarget(source, invoker, targetId, verb) {
  const guild = source.guild;
  const botId = source.client.user.id;

  let pool = null;
  if (targetId === botId) pool = BOT_LINES;
  else if (targetId === guild.ownerId && invoker.id !== guild.ownerId) pool = OWNER_LINES;
  if (!pool) return false;

  const text = pick(pool).replace(/\{v\}/g, verb).replace(/\{user\}/g, `<@${invoker.id}>`);
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

  await source.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  }).catch(() => {});
  return true;
}

module.exports = { blockProtectedTarget, OWNER_LINES, BOT_LINES };
