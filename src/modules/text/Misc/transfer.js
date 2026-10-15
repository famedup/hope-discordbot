//
//  Made with care by cashholy (carti)
//

// hope — ,transfer is a shortcut for `ticket transfer` (works inside ticket channels).

module.exports = {
    name: 'transfer',
    description: 'Hand the current ticket to another staff member',
    async execute(message, args) {
        return require('../../dual/ticket/ticket').execute(message, ['transfer', ...args]);
    },
};
