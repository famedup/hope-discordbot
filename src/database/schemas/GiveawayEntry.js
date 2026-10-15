/**
 * ┌ cashholy (carti)
 * └ database/schemas/GiveawayEntry.js
 */

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

class GiveawayEntry extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                giveawayId: { type: DataTypes.INTEGER, allowNull: false },
                userId: { type: DataTypes.STRING, allowNull: false }
            },
            {
                sequelize,
                modelName: 'GiveawayEntry',
                tableName: 'giveaway_entries',
                timestamps: true,
                indexes: [
                    { fields: ['giveawayId'] },
                    { fields: ['giveawayId', 'userId'], unique: true },
                ],
            }
        );

        return this;
    }

    static associate(models) {
        this.belongsTo(models.Giveaway, {
            foreignKey: 'giveawayId',
            as: 'giveaway',
        });
    }
}

module.exports = GiveawayEntry;
