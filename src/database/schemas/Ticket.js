// ▛▀ cashholy (carti) ▀▜

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class Ticket extends BaseModel {
    static CACHE_KEYS = [['channelId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false },
                channelId: { type: DataTypes.STRING, allowNull: false, unique: true },
                userId: { type: DataTypes.STRING, allowNull: false },
                categoryName: { type: DataTypes.STRING, allowNull: false },
                claimedBy: { type: DataTypes.STRING, allowNull: true },
                status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'open' },
                closedAt: { type: DataTypes.DATE, allowNull: true },
                // v2 (panels, numbering, automation)
                panelId: { type: DataTypes.INTEGER, allowNull: true },
                caseNumber: { type: DataTypes.INTEGER, allowNull: true },
                reason: { type: DataTypes.TEXT, allowNull: true },
                rating: { type: DataTypes.INTEGER, allowNull: true },
                lastActivityAt: { type: DataTypes.DATE, allowNull: true },
                warnedAt: { type: DataTypes.DATE, allowNull: true },
                warnMessageId: { type: DataTypes.STRING, allowNull: true },
                deleteAt: { type: DataTypes.DATE, allowNull: true },
            },
            {
                sequelize,
                modelName: 'Ticket',
                tableName: 'tickets',
                timestamps: true,
                indexes: [
                    { unique: true, fields: ['channelId'] },
                    { fields: ['guildId', 'userId', 'status'] },
                ],
            }
        );
        return this;
    }
}

module.exports = Ticket;
