// ─── cashholy (carti) · developer ───

// Member warnings (used by warn, warnings, delwarn, clearwarns)

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

class Warn extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                guildId: { type: DataTypes.STRING, allowNull: false },
                userId: { type: DataTypes.STRING, allowNull: false },
                moderatorId: { type: DataTypes.STRING, allowNull: false },
                reason: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'No reason provided' },
            },
            {
                sequelize,
                modelName: 'Warn',
                tableName: 'warns',
                timestamps: true,
                indexes: [{ fields: ['guildId', 'userId'], name: 'warns_guild_user' }],
            }
        );
        return this;
    }
}

module.exports = Warn;
