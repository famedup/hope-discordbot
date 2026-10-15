/*! © 2026 cashholy (carti) !*/

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

class Giveaway extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false },
                channelId: { type: DataTypes.STRING, allowNull: false },
                messageId: { type: DataTypes.STRING, allowNull: true },
                hostId: { type: DataTypes.STRING, allowNull: false },
                prize: { type: DataTypes.STRING, allowNull: false },
                winners: { type: DataTypes.INTEGER, allowNull: false },
                endTime: { type: DataTypes.BIGINT, allowNull: false },
                ended: { type: DataTypes.BOOLEAN, defaultValue: false }
            },
            {
                sequelize,
                modelName: 'Giveaway',
                tableName: 'giveaways',
                timestamps: true,
                indexes: [
                    { fields: ['ended', 'endTime'] },
                    { fields: ['guildId'] },
                ],
            }
        );

        return this;
    }

    static associate(models) {
        this.hasMany(models.GiveawayEntry, {
            foreignKey: 'giveawayId',
            as: 'entries',
            onDelete: 'CASCADE',
        });
    }
}

module.exports = Giveaway;
