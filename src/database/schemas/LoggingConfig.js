/**
 * @file LoggingConfig.js
 * @developer cashholy (carti)
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class LoggingConfig extends BaseModel {
    static CACHE_KEYS = [['guildId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true, comment: 'Discord Guild ID' },

                // Legacy columns (kept for backward compatibility)
                serverEventsChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Legacy: Channel for server events' },
                userEventsChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Legacy: Channel for user events' },
                voiceEventsChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Legacy: Channel for voice events' },
                messageEventsChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Legacy: Channel for message events' },

                // 5 grouped log channels
                messageLogsChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Message delete/edit/bulk delete logs' },
                memberLogsChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Member join/leave/update logs' },
                moderationLogsChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Ban/unban/kick/timeout logs' },
                serverLogsChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Channel/role/server/emoji/sticker logs' },
                voiceLogsChannelId: { type: DataTypes.STRING, allowNull: true, comment: 'Voice join/leave/switch/mute logs' },
            },
            {
                sequelize,
                modelName: 'LoggingConfig',
                tableName: 'logging_config',
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

    // Helper to get channel with fallback to legacy
    static getChannel(config, newField, legacyField) {
        return config[newField] || config[legacyField] || null;
    }
}

module.exports = LoggingConfig;
