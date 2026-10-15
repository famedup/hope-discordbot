// [dev] cashholy (carti) :: modules/text/Misc/close.js

// hope — ,close is a shortcut for `ticket close` (works inside ticket channels).

module.exports = {
    name: 'close',
    description: 'Close the current ticket',
    async execute(message, args) {
        return require('../../dual/ticket/ticket').execute(message, ['close', ...args]);
    },
};
