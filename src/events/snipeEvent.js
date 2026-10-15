// »» engineered by cashholy (carti) ««

const { snipeData, editSnipeData } = require('../modules/interactions/general/general');

module.exports = {
  init(client) {
    client.on('messageDelete', async (message) => {
      if (!message.guild || !message.author || message.author.bot) return;

      let channelSnipes = snipeData.get(message.channel.id);

      if (!Array.isArray(channelSnipes)) {
        channelSnipes = [];
        snipeData.set(message.channel.id, channelSnipes);
      }

      if (channelSnipes.length >= 10) {
        channelSnipes.pop();
      }

      const attachments = message.attachments.map(att => ({
        name: att.name,
        url: att.url
      }));

      channelSnipes.unshift({
        author_name: message.author.username,
        author_display_name: message.author.displayName,
        author_avatar: message.author.displayAvatarURL({ size: 128 }),
        author_id: message.author.id,
        content: message.content || null,
        deleted_at: Math.floor(Date.now() / 1000),
        attachments: attachments
      });
    });

    client.on('messageUpdate', async (before, after) => {
      if (!before.guild || !before.author || before.author.bot) return;
      if (before.content === after.content) return;

      let channelEditSnipes = editSnipeData.get(before.channel.id);

      if (!Array.isArray(channelEditSnipes)) {
        channelEditSnipes = [];
        editSnipeData.set(before.channel.id, channelEditSnipes);
      }

      if (channelEditSnipes.length >= 10) {
        channelEditSnipes.pop();
      }

      const attachments_before = before.attachments.map(att => ({
        name: att.name,
        url: att.url
      }));

      const attachments_after = after.attachments.map(att => ({
        name: att.name,
        url: att.url
      }));

      channelEditSnipes.unshift({
        author_name: before.author.username,
        author_display_name: before.author.displayName,
        author_avatar: before.author.displayAvatarURL({ size: 128 }),
        author_id: before.author.id,
        content_before: before.content || null,
        content_after: after.content || null,
        edited_at: Math.floor(Date.now() / 1000),
        attachments_before: attachments_before,
        attachments_after: attachments_after
      });
    });
  }
};
