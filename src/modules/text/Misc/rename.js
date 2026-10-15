// ─── cashholy (carti) · developer ───

// hope — ,rename is a shortcut for `ticket rename` (works inside ticket channels).

module.exports = {
    name: 'rename',
    description: 'Rename the current ticket channel',
    async execute(message, args) {
        return require('../../dual/ticket/ticket').execute(message, ['rename', ...args]);
    },
};
