// »» engineered by cashholy (carti) ««

// hope — ,claim is a shortcut for `ticket claim` (works inside ticket channels).

module.exports = {
    name: 'claim',
    description: 'Claim the current ticket',
    async execute(message, args) {
        return require('../../dual/ticket/ticket').execute(message, ['claim', ...args]);
    },
};
