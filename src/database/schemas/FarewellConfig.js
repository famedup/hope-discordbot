/* ⌁ crafted by cashholy (carti) ⌁ */

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class FarewellConfig extends BaseModel {
    static CACHE_KEYS = [['guildId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, unique: true, comment: 'Discord Guild ID' },
                channelId: { type: DataTypes.STRING, allowNull: true, comment: 'Farewell message channel ID' },
                type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'simple', comment: 'Farewell type: simple or container' },
                message: { type: DataTypes.TEXT, allowNull: true, comment: 'Farewell message content (for simple type)' },
                title: { type: DataTypes.STRING, allowNull: true, comment: 'Container title' },
                description: { type: DataTypes.TEXT, allowNull: true, comment: 'Container description' },
                color: { type: DataTypes.INTEGER, allowNull: true, comment: 'Container accent color (hex)' },
                thumbnailUrl: { type: DataTypes.STRING, allowNull: true, comment: 'Container thumbnail URL' },
                imageUrl: { type: DataTypes.STRING, allowNull: true, comment: 'Container image URL' },
            },
            {
                sequelize,
                modelName: 'FarewellConfig',
                tableName: 'farewell_config',
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
}

module.exports = FarewellConfig;
