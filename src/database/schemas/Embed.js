/**
 * ┌ cashholy (carti)
 * └ database/schemas/Embed.js
 */

// Saved custom embeds (one row per embed per server)

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

class Embed extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false },
                name: { type: DataTypes.STRING(16), allowNull: false },
                data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
                createdBy: { type: DataTypes.STRING, allowNull: true },
            },
            {
                sequelize,
                modelName: 'Embed',
                tableName: 'custom_embeds',
                timestamps: true,
                indexes: [
                    { unique: true, fields: ['guildId', 'name'], name: 'custom_embeds_guild_name' },
                ],
            }
        );
        return this;
    }
}

module.exports = Embed;
