/*! © 2026 cashholy (carti) !*/

const Giveaway = require('../../../../database/schemas/Giveaway');
const { endGiveaway } = require('../../../../services/giveawayUtils');
const ui = require('../../../../services/giveawayUI');

module.exports = {
  async execute(interactionOrMessage, args = []) {
    const isSlash = interactionOrMessage.isCommand?.();
    const member = interactionOrMessage.member;

    if (!member.permissions.has('ManageGuild')) {
      return ui.respond(
        interactionOrMessage,
        ui.notice('Permission denied', 'You need the `Manage Server` permission to end giveaways.'),
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
      where: {
        messageId: targetMessageId,
        guildId: interactionOrMessage.guild.id,
        ended: false,
      },
    });

    if (!giveaway) {
      return ui.respond(
        interactionOrMessage,
        ui.notice('Not found', 'No active giveaway found for that message.'),
        { ephemeral: true }
      );
    }

    await endGiveaway(interactionOrMessage.client, giveaway);
    await giveaway.update({ ended: true });

    return ui.respond(
      interactionOrMessage,
      ui.notice('Giveaway ended', 'The giveaway has been ended and winners were picked.'),
      { ephemeral: true }
    );
  }
};
