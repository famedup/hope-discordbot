/* ---
   author : cashholy (carti)
   module : ModLog
   --- */

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class ModLog extends BaseModel {
    static CACHE_KEYS = [['guildId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord Guild ID' },
                moderatorId: { type: DataTypes.STRING, allowNull: false, comment: 'Moderator User ID (bot for automod)' },
                moderatorTag: { type: DataTypes.STRING, allowNull: false, comment: 'Moderator username#discriminator' },
                targetId: { type: DataTypes.STRING, allowNull: false, comment: 'Target User ID' },
                targetTag: { type: DataTypes.STRING, allowNull: false, comment: 'Target username#discriminator' },
                action: { type: DataTypes.STRING, allowNull: false, comment: 'Action taken: delete, warn, mute, kick, ban' },
                reason: { type: DataTypes.TEXT, allowNull: true, comment: 'Reason for the action' },
                channelId: { type: DataTypes.STRING, allowNull: true, comment: 'Channel where action occurred' },
                source: { type: DataTypes.STRING, defaultValue: 'automod', comment: 'Source: automod, manual, antinuke' },
            },
            {
                sequelize,
                modelName: 'ModLog',
                tableName: 'mod_logs',
                timestamps: true,
                indexes: [
                    {
                        fields: ['guildId'],
                    },
                    {
                        fields: ['targetId'],
                    },
                    {
                        fields: ['createdAt'],
                    },
                ],
            }
        );
        return this;
    }
}

module.exports = ModLog;
