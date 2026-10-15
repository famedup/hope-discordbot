/**
 * ┌ cashholy (carti)
 * └ database/schemas/TicketCategory.js
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class TicketCategory extends BaseModel {
    static CACHE_KEYS = [['guildId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false },
                categoryName: { type: DataTypes.STRING, allowNull: false },
                categoryId: { type: DataTypes.STRING, allowNull: true },
                emoji: { type: DataTypes.STRING, allowNull: true },
                description: { type: DataTypes.STRING, allowNull: true },
            },
            {
                sequelize,
                modelName: 'TicketCategory',
                tableName: 'ticket_categories',
                timestamps: true,
                indexes: [
                    { fields: ['guildId'] },
                    { fields: ['guildId', 'categoryName'] },
                ],
            }
        );
        return this;
    }
}

module.exports = TicketCategory;
