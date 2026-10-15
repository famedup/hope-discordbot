/*! © 2026 cashholy (carti) !*/

const Giveaway = require('../../../../database/schemas/Giveaway');
const GiveawayEntry = require('../../../../database/schemas/GiveawayEntry');
const { pickWinners, notifyWinners } = require('../../../../services/giveawayUtils');
const ui = require('../../../../services/giveawayUI');

module.exports = {
  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();
    const member = interactionOrMessage.member;
    const guild = interactionOrMessage.guild;

    if (!member.permissions.has('ManageGuild')) {
      return ui.respond(
        interactionOrMessage,
        ui.notice('Permission denied', 'You need the `Manage Server` permission to reroll giveaways.'),
        { ephemeral: true }
      );
    }

    let targetMessageId;

    if (isSlash) {
      targetMessageId = interactionOrMessage.options.getString('message_id');
    } else if (interactionOrMessage.reference?.messageId) {
      targetMessageId = interactionOrMessage.reference.messageId;
    } else if (args[0]) {
      targetMessageId = args[0];
    } else {
      return ui.respond(
        interactionOrMessage,
        ui.notice('No message found', 'Reply to a giveaway message or provide its message ID.')
      );
    }

    const giveaway = await Giveaway.findOne({
      where: { messageId: targetMessageId, guildId: guild.id, ended: true },
    });

    if (!giveaway) {
      return ui.respond(
        interactionOrMessage,
        ui.notice('Not found', 'No ended giveaway found for that message.'),
        { ephemeral: true }
      );
    }

    const entries = await GiveawayEntry.findAll({ where: { giveawayId: giveaway.id } });

    if (!entries.length) {
      return ui.respond(
        interactionOrMessage,
        ui.notice('No entries', 'There are no entries to reroll.'),
        { ephemeral: true }
      );
    }

    const channel = guild.channels.cache.get(giveaway.channelId) || interactionOrMessage.channel;
    const giveawayMsg = await channel.messages.fetch(giveaway.messageId).catch(() => null);

    const winnerIds = pickWinners(entries, giveaway.winners);

    // keep the original card truthful: show the new winners
    if (giveawayMsg) {
      await giveawayMsg
        .edit({
          embeds: [ui.buildGiveawayEmbed(giveaway, guild, { ended: true, winnerIds })],
          components: [ui.buildGiveawayRow(giveaway, entries.length, true)],
        })
        .catch((e) => console.error('Failed to update rerolled giveaway:', e.message));
    }

    await channel.send(ui.buildAnnouncement(giveaway, winnerIds, giveawayMsg?.url, { reroll: true }));

    await ui.respond(
      interactionOrMessage,
      ui.notice('Reroll complete', 'New winners have been selected.'),
      { ephemeral: true }
    );

    await notifyWinners(interactionOrMessage.client, guild, giveaway, winnerIds, giveawayMsg?.url);
  }
};
