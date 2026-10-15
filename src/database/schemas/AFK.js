// dev: cashholy (carti) | module: AFK

/**
 * @namespace: database/models/AFK.js
 * @type: Database Model
 * @copyright © 2025 kenndeclouv
 * @assistant chaa & graa
 * @version 0.9.9-beta-rc.5
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class AFK extends BaseModel {
    static CACHE_KEYS = [['guildId', 'userId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord Guild ID' },
                userId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord User ID' },
                reason: { type: DataTypes.TEXT, allowNull: false },
                time: { type: DataTypes.BIGINT, allowNull: false },
                dm: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            },
            {
                sequelize,
                modelName: 'AFK',
                tableName: 'afk',
                timestamps: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['guildId', 'userId'],
                    },
                ],
            }
        );
        return this;
    }
}

module.exports = AFK;
