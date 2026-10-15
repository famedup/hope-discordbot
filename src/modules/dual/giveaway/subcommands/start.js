// @cashholy(carti) — start

const Giveaway = require('../../../../database/schemas/Giveaway');
const ui = require('../../../../services/giveawayUI');

module.exports = {
  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();
    const member = interactionOrMessage.member;
    const user = isSlash ? interactionOrMessage.user : interactionOrMessage.author;

    if (!member.permissions.has('ManageGuild')) {
      return ui.respond(
        interactionOrMessage,
        ui.notice('Permission denied', 'You need the `Manage Server` permission to start giveaways.'),
        { ephemeral: true }
      );
    }

    let timeStr, winnersCount, prize;

    if (isSlash) {
      timeStr = interactionOrMessage.options.getString('duration');
      winnersCount = interactionOrMessage.options.getInteger('winners');
      prize = interactionOrMessage.options.getString('prize');
    } else {
      if (args.length < 3) {
        return ui.respond(
          interactionOrMessage,
          ui.notice(
            'Invalid usage',
            'Usage: `gstart <time> <winners> <prize>`\nExample: `gstart 1h 2 Discord Nitro`'
          )
        );
      }

      timeStr = args[0];
      winnersCount = /^\d+$/.test(args[1]) ? parseInt(args[1], 10) : NaN;
      prize = args.slice(2).join(' ');
    }

    const seconds = ui.parseDuration(timeStr);
    if (seconds <= 0) {
      return ui.respond(
        interactionOrMessage,
        ui.notice('Invalid time', 'Use a format like `30s`, `10m`, `1h`, `1d` or `1h30m`.'),
        { ephemeral: true }
      );
    }

    if (!Number.isInteger(winnersCount) || winnersCount < 1 || winnersCount > ui.MAX_WINNERS) {
      return ui.respond(
        interactionOrMessage,
        ui.notice('Invalid winners', `Winners must be between 1 and ${ui.MAX_WINNERS}.`),
        { ephemeral: true }
      );
    }

    prize = prize.trim().slice(0, 255);
    const endTime = Math.floor(Date.now() / 1000) + seconds;

    const giveaway = await Giveaway.create({
      guildId: interactionOrMessage.guild.id,
      channelId: interactionOrMessage.channel.id,
      hostId: user.id,
      prize,
      winners: winnersCount,
      endTime,
      ended: false,
    });

    let giveawayMsg;
    try {
      giveawayMsg = await interactionOrMessage.channel.send({
        embeds: [ui.buildGiveawayEmbed(giveaway, interactionOrMessage.guild)],
        components: [ui.buildGiveawayRow(giveaway, 0, false)],
      });
    } catch (e) {
      console.error('Failed to send giveaway message:', e.message);
      await giveaway.destroy().catch(() => {});
      return ui.respond(
        interactionOrMessage,
        ui.notice('Could not start', 'I need `Send Messages` and `Embed Links` in this channel.'),
        { ephemeral: true }
      );
    }

    await giveaway.update({ messageId: giveawayMsg.id });

    const confirmMsg = await ui.respond(
      interactionOrMessage,
      ui.notice('Giveaway started', `Live in ${interactionOrMessage.channel} · [Jump to giveaway](${giveawayMsg.url})`),
      { ephemeral: true }
    );

    if (!isSlash && confirmMsg) {
      setTimeout(() => {
        confirmMsg.delete().catch(() => {});
      }, 5000);
    }
  }
};
