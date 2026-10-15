// ▛▀ cashholy (carti) ▀▜

// Saved custom containers (one row per container message per server)

const { DataTypes } = require('sequelize');
const BaseModel = require('../BaseModel');

class Container extends BaseModel {
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
                modelName: 'Container',
                tableName: 'custom_containers',
                timestamps: true,
                indexes: [
                    { unique: true, fields: ['guildId', 'name'], name: 'custom_containers_guild_name' },
                ],
            }
        );
        return this;
    }
}

module.exports = Container;
