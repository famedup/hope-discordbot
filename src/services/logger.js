/** @author cashholy (carti) */

const config = require('../settings');
const emojis = require('../media/emojis.json');

class Logger {
    constructor() {
        this.logChannel = null;
    }

        setLogChannel(channel) {
        this.logChannel = channel;
    }

        async sendLog(logMessage) {
        if (!this.logChannel) return;

        try {
            await this.logChannel.send(logMessage);
        } catch (error) {
            console.error('Failed to send log to Discord channel:', error);
        }
    }

        consoleLog(type, message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type}] ${message}`);
    }
}

const logger = new Logger();
module.exports = logger;
