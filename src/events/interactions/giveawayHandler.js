/** @author cashholy (carti) */

const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');
const Giveaway = require('../../database/schemas/Giveaway');
const GiveawayEntry = require('../../database/schemas/GiveawayEntry');
const { createPaginationSession } = require('../../services/pagination');
const ui = require('../../services/giveawayUI');

// Entry-count refreshes are batched per giveaway so a burst of clicks
// doesn't hammer the message-edit rate limit.
const pendingRefresh = new Map();
const REFRESH_DELAY_MS = 2000;

function scheduleCountRefresh(message, giveawayId) {
  const existing = pendingRefresh.get(giveawayId);
  if (existing) {
    existing.message = message;
    return;
  }

  const job = { message };
  job.timer = setTimeout(async () => {
    pendingRefresh.delete(giveawayId);
    try {
      const fresh = await Giveaway.findByPk(giveawayId);
      if (!fresh || fresh.ended) return;
      const count = await GiveawayEntry.count({ where: { giveawayId } });
      await job.message.edit({ components: [ui.buildGiveawayRow(fresh, count, false)] });
    } catch (e) {
      console.error('Failed to refresh giveaway entry count:', e.message);
    }
  }, REFRESH_DELAY_MS);

  pendingRefresh.set(giveawayId, job);
}

async function handle(interaction) {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id.startsWith('giveaway_enter_')) {
      const giveawayId = parseInt(id.replace('giveaway_enter_', ''));
      const giveaway = await Giveaway.findByPk(giveawayId);

      if (!giveaway || giveaway.ended) {
        return ui.respond(
          interaction,
          ui.notice('Giveaway ended', 'This giveaway has already ended.'),
          { ephemeral: true }
        );
      }

      const existingEntry = await GiveawayEntry.findOne({
        where: { giveawayId: giveaway.id, userId: interaction.user.id }
      });

      if (existingEntry) {
        return ui.respond(
          interaction,
          ui.notice('Already entered', 'You have already entered this giveaway.'),
          { ephemeral: true }
        );
      }

      try {
        await GiveawayEntry.create({ giveawayId: giveaway.id, userId: interaction.user.id });
      } catch (e) {
        // unique (giveawayId, userId) - double click race
        return ui.respond(
          interaction,
          ui.notice('Already entered', 'You have already entered this giveaway.'),
          { ephemeral: true }
        );
      }

      await ui.respond(
        interaction,
        ui.notice('Entry confirmed', 'You are in. Good luck!'),
        { ephemeral: true }
      );

      scheduleCountRefresh(interaction.message, giveaway.id);
      return true;
    }

    if (id.startsWith('giveaway_participants_')) {
      const giveawayId = parseInt(id.replace('giveaway_participants_', ''));
      const giveaway = await Giveaway.findByPk(giveawayId);

      if (!giveaway) {
        return ui.respond(
          interaction,
          ui.notice('Giveaway not found', 'This giveaway no longer exists.'),
          { ephemeral: true }
        );
      }

      const entries = await GiveawayEntry.findAll({
        where: { giveawayId: giveaway.id }
      });

      if (entries.length === 0) {
        return ui.respond(
          interaction,
          ui.notice('No participants yet', 'No one has entered this giveaway yet.'),
          { ephemeral: true }
        );
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const itemsPerPage = 7;
      const pages = [];
      for (let i = 0; i < entries.length; i += itemsPerPage) {
        pages.push(entries.slice(i, i + itemsPerPage));
      }

      // The shared pagination service renders Components V2 containers, so the
      // participants pop-up keeps using one (it is ephemeral and only seen by the clicker).
      const paginationSession = createPaginationSession({
        interactionOrMessage: interaction,
        pages: pages,
        renderPage: (pageIndex, pageData) => {
          const container = new ContainerBuilder().setAccentColor(ui.COLOR);

          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Giveaway Participants [${entries.length}]**`)
          );
          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );

          const participantList = pageData.map((entry, idx) => {
            const globalIdx = pageIndex * itemsPerPage + idx + 1;
            return `\`${globalIdx}.\` <@${entry.userId}>`;
          }).join('\n');

          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(participantList)
          );

          container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          );

          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Prize:** ${giveaway.prize}\n**Total Entries:** ${entries.length}`)
          );

          return container;
        },
        userId: interaction.user.id,
        timeout: 300000,
        ephemeral: true
      });

      await paginationSession.renderInitial();
      return true;
    }
  }

  return false;
}

module.exports = { handle };
