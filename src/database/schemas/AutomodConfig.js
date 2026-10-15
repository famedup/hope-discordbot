/**
 * @file AutomodConfig.js
 * @developer cashholy (carti)
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class AutomodConfig extends BaseModel {
    static CACHE_KEYS = [['guildId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true, comment: 'Discord Guild ID' },
                enabled: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Whether automod is enabled' },
                logChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Channel for automod logs' },
                punishment: { type: DataTypes.STRING, defaultValue: 'delete', comment: 'Punishment: delete, warn, mute, kick, ban' },
                muteDuration: { type: DataTypes.INTEGER, defaultValue: 300, comment: 'Mute duration in seconds' },

                // Individual Punishment Types for Each Event
                antiSpamPunishment: { type: DataTypes.STRING, defaultValue: 'delete', comment: 'Spam punishment: delete, warn, mute, kick, ban' },
                antiLinkPunishment: { type: DataTypes.STRING, defaultValue: 'delete', comment: 'Link punishment' },
                antiInvitePunishment: { type: DataTypes.STRING, defaultValue: 'delete', comment: 'Invite punishment' },
                antiBadWordsPunishment: { type: DataTypes.STRING, defaultValue: 'delete', comment: 'Bad words punishment' },
                antiMassMentionPunishment: { type: DataTypes.STRING, defaultValue: 'delete', comment: 'Mass mention punishment' },
                antiCapsPunishment: { type: DataTypes.STRING, defaultValue: 'delete', comment: 'Caps punishment' },
                antiPingPunishment: { type: DataTypes.STRING, defaultValue: 'delete', comment: 'Ping (@everyone/@here) punishment' },

                // Modules
                antiSpam: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Rate limit messages' },
                antiLink: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Block links' },
                antiInvite: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Block Discord invites' },
                antiBadWords: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Word filter' },
                antiMassMention: { type: DataTypes.BOOLEAN, defaultValue: true, comment: 'Limit mentions' },
                antiCaps: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Block excessive caps' },
                antiPing: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Block @everyone / @here pings' },

                // Thresholds
                spamThreshold: { type: DataTypes.INTEGER, defaultValue: 5, comment: 'Messages per interval' },
                spamInterval: { type: DataTypes.INTEGER, defaultValue: 5, comment: 'Time window in seconds' },
                mentionLimit: { type: DataTypes.INTEGER, defaultValue: 5, comment: 'Max mentions per message' },
                capsPercentage: { type: DataTypes.INTEGER, defaultValue: 70, comment: 'Max percentage of caps allowed' },
                capsMinLength: { type: DataTypes.INTEGER, defaultValue: 10, comment: 'Min message length to check caps' },

                // Bad words list (stored as JSON)
                badWords: { type: DataTypes.TEXT, defaultValue: '[]', comment: 'JSON array of banned words' },
            },
            {
                sequelize,
                modelName: 'AutomodConfig',
                tableName: 'automod_config',
                timestamps: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['guildId'],
                    },
                ],
            }
        );
        return this;
    }

    getBadWords() {
        try {
            return JSON.parse(this.badWords || '[]');
        } catch {
            return [];
        }
    }

    async setBadWords(words) {
        this.badWords = JSON.stringify(words);
        await this.save();
    }

    async addBadWord(word) {
        const words = this.getBadWords();
        if (!words.includes(word.toLowerCase())) {
            words.push(word.toLowerCase());
            await this.setBadWords(words);
        }
    }

    async removeBadWord(word) {
        const words = this.getBadWords();
        const index = words.indexOf(word.toLowerCase());
        if (index > -1) {
            words.splice(index, 1);
            await this.setBadWords(words);
        }
    }
}

module.exports = AutomodConfig;
