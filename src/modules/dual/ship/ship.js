// @cashholy(carti) — ship

// hope — ship (hybrid). Sends only the card image.
//   ,ship                → you + a random member
//   ,ship @a             → @a + you (user2 only in slash → you + them)
//   ,ship @a @b          → @a + @b
// Slash: /ship [user1] [user2]

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const ui = require('../../../services/ui');
const { renderShip } = require('../../../services/shipCard');

const NO_MENTIONS = { parse: [] };

async function randomMember(guild, exclude) {
  const pick = () => guild.members.cache.filter(m => !m.user.bot && !exclude.has(m.id));
  let pool = pick();
  if (pool.size < 5) {
    await guild.members.fetch({ limit: 100 }).catch(() => null);
    pool = pick();
  }
  return pool.size ? pool.random().user : null;
}

async function usersFromArgs(message, args) {
  const out = [...message.mentions.users.values()];
  for (const a of args) {
    if (out.length >= 2) break;
    if (/^\d{17,20}$/.test(a) && !out.some(u => u.id === a)) {
      const u = await message.client.users.fetch(a).catch(() => null);
      if (u) out.push(u);
    }
  }
  return out;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Check how well two people match')
    .addUserOption(o => o.setName('user1').setDescription('First person'))
    .addUserOption(o => o.setName('user2').setDescription('Second person')),

  name: 'ship',
  description: 'Check how well two people match',
  aliases: ['shipping'],
  category: 'fun',

  async execute(ctx, args = []) {
    const isSlash = ctx.isChatInputCommand?.();
    const author = isSlash ? ctx.user : ctx.author;
    const guild = ctx.guild;
    if (!guild) return ui.say.error(ctx, 'Use this in a server');

    let first; let second;
    if (isSlash) {
      first = ctx.options.getUser('user1');
      second = ctx.options.getUser('user2');
      await ctx.deferReply();
    } else {
      [first, second] = await usersFromArgs(ctx, args);
    }

    // none → you + random; one → that person + you; user2 only → you + them; two → as given
    if (!first && !second) first = author;
    else if (first && !second) second = first.id === author.id ? null : author;
    else if (!first && second) first = author;
    if (!second) second = await randomMember(guild, new Set([first.id, author.id]));
    if (!second) {
      const msg = 'No one else to ship with yet';
      return isSlash ? ctx.editReply({ content: msg }) : ui.say.error(ctx, msg);
    }

    const name = (u) => guild.members.cache.get(u.id)?.displayName ?? u.displayName ?? u.username;
    try {
      const { buffer } = await renderShip(
        { name: name(first), avatar: first.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true }) },
        { name: name(second), avatar: second.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true }) },
        first.id, second.id,
      );
      const file = new AttachmentBuilder(buffer, { name: 'ship.png', description: `${name(first)} and ${name(second)}` });
      const body = { files: [file], allowedMentions: NO_MENTIONS };
      return isSlash ? ctx.editReply(body) : ctx.reply(body);
    } catch (err) {
      console.error('ship error:', err);
      const msg = 'Could not draw the card, try again';
      return isSlash ? ctx.editReply({ content: msg }) : ui.say.error(ctx, msg);
    }
  },
};
