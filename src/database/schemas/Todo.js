/*! © 2026 cashholy (carti) !*/

/**
 * @namespace: database/models/Todo.js
 * @type: Database Model
 * @copyright © 2025 kenndeclouv
 * @assistant chaa & graa
 * @version 0.9.9-beta-rc.5
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class Todo extends BaseModel {
    static CACHE_KEYS = [['guildId', 'userId']];
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                userId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord User ID' },
                guildId: { type: DataTypes.STRING, allowNull: false, comment: 'Discord Guild ID' },
                task: { type: DataTypes.STRING(500), allowNull: false },
                completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            },
            {
                sequelize,
                modelName: 'Todo',
                tableName: 'todos',
                timestamps: true,
                indexes: [
                    {
                        fields: ['userId', 'guildId'],
                    },
                ],
            }
        );
        return this;
    }
}

module.exports = Todo;
