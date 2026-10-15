/* ---
   author : cashholy (carti)
   module : giveawayUtils
   --- */

const { Op } = require('sequelize');
const Giveaway = require('../database/schemas/Giveaway');
const GiveawayEntry = require('../database/schemas/GiveawayEntry');
const ui = require('./giveawayUI');

let isChecking = false;

/** Pick up to `count` unique winners from a list of entries. */
function pickWinners(entries, count) {
  const pool = [...entries];
  const winners = [];
  const total = Math.min(Number(count), pool.length);

  for (let i = 0; i < total; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0].userId);
  }
  return winners;
}

/** DM every winner (failures are ignored - closed DMs are common). */
async function notifyWinners(client, guild, giveaway, winnerIds, url) {
  await Promise.all(
    winnerIds.map(async (userId) => {
      try {
        const user = await client.users.fetch(userId);
        await user.send(ui.buildWinnerDM(giveaway, guild, url));
      } catch (e) {
        console.error(`Failed to DM giveaway winner ${userId}:`, e.message);
      }
    })
  );
}

async function endGiveaway(client, giveaway) {
  try {
    const guild = client.guilds.cache.get(giveaway.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    const entries = await GiveawayEntry.findAll({ where: { giveawayId: giveaway.id } });
    const winnerIds = pickWinners(entries, giveaway.winners);

    // Re-skin the original card: ended state, winners listed, entry button locked.
    let giveawayMsg = null;
    try {
      giveawayMsg = await channel.messages.fetch(giveaway.messageId);
      await giveawayMsg.edit({
        embeds: [ui.buildGiveawayEmbed(giveaway, guild, { ended: true, winnerIds })],
        components: [ui.buildGiveawayRow(giveaway, entries.length, true)],
      });
    } catch (e) {
      console.error('Failed to update giveaway message:', e.message);
    }

    if (!winnerIds.length) return;

    await channel.send(ui.buildAnnouncement(giveaway, winnerIds, giveawayMsg?.url));
    await notifyWinners(client, guild, giveaway, winnerIds, giveawayMsg?.url);
  } catch (e) {
    console.error('Error ending giveaway:', e);
  }
}

async function checkGiveaways(client) {
  if (isChecking) return;
  isChecking = true;
  try {
    const now = Math.floor(Date.now() / 1000);
    const expired = await Giveaway.findAll({
      where: { ended: false, endTime: { [Op.lte]: now } },
    });

    if (expired.length === 0) return;

    await Promise.all(
      expired.map(async (giveaway) => {
        await endGiveaway(client, giveaway);
        await giveaway.update({ ended: true });
      })
    );
  } finally {
    isChecking = false;
  }
}

module.exports = {
  endGiveaway,
  checkGiveaways,
  pickWinners,
  notifyWinners,
};
