// @cashholy(carti) — TempChannel

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class TempChannel extends BaseModel {
    static CACHE_KEYS = [['channelId'], ['guildId', 'ownerId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                channelId: { type: DataTypes.STRING, allowNull: false, unique: true, comment: 'Discord Voice Channel ID' },
                guildId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord Guild ID' },
                ownerId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord User ID of owner' },
            },
            {
                sequelize,
                modelName: 'TempChannel',
                tableName: 'temp_channels',
                timestamps: false,
                indexes: [
                    {
                        unique: true,
                        fields: ['channelId'],
                    },
                    {
                        fields: ['guildId', 'ownerId'],
                    },
                ],
            }
        );
        return this;
    }
}

module.exports = TempChannel;
