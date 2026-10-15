// dev: cashholy (carti) | module: transcript

// hope — ,transcript is a shortcut for `ticket transcript` (works inside ticket channels).

module.exports = {
    name: 'transcript',
    description: 'Get the current ticket transcript',
    async execute(message, args) {
        return require('../../dual/ticket/ticket').execute(message, ['transcript', ...args]);
    },
};
