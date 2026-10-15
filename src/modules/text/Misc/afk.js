// »» engineered by cashholy (carti) ««

const ui = require('../../../services/ui');
const afk = require('../../../services/afkTools');

module.exports = {
    name: 'afk',
    description: 'Set yourself as AFK (the reason is optional)',
    aliases: [],

    async execute(message, args) {
        // `--dm` anywhere in the text = DM me when I'm mentioned
        const dm = args.some(a => a.toLowerCase() === '--dm');
        const text = args.filter(a => a.toLowerCase() !== '--dm').join(' ');

        const checked = afk.cleanReason(text);
        if (!checked.ok) return ui.say.error(message, checked.error);

        const { updated } = await afk.setAfk({ guildId: message.guildId, userId: message.author.id, reason: checked.reason, dm });
        const make = updated ? afk.updatedMessage : afk.setMessage;
        return message.reply(afk.body(make(message.author.id, checked.reason)));
    },
};
