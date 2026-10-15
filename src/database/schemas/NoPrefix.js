/*! © 2026 cashholy (carti) !*/

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

const _noPrefixCache = new Map();
const NO_PREFIX_CACHE_TTL = 30000;

class NoPrefix extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                userId: { type: DataTypes.STRING, allowNull: false, unique: true },
                username: { type: DataTypes.STRING, allowNull: false },
                grantedBy: { type: DataTypes.STRING, allowNull: false },
                grantedByUsername: { type: DataTypes.STRING, allowNull: false },
                expiresAt: { type: DataTypes.DATE, allowNull: true },
                duration: { type: DataTypes.STRING, allowNull: false },
            },
            {
                sequelize,
                modelName: 'NoPrefix',
                tableName: 'no_prefix',
                timestamps: true,
            }
        );

        return this;
    }

    static invalidateCache(userId) {
        _noPrefixCache.delete(userId);
    }

    static async isNoPrefixUser(userId) {
        const cached = _noPrefixCache.get(userId);
        if (cached && Date.now() - cached.ts < NO_PREFIX_CACHE_TTL) return cached.val;

        const record = await this.findOne({ where: { userId } });
        if (!record) {
            _noPrefixCache.set(userId, { val: false, ts: Date.now() });
            return false;
        }

        if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
            await record.destroy();
            _noPrefixCache.set(userId, { val: false, ts: Date.now() });
            return false;
        }

        _noPrefixCache.set(userId, { val: true, ts: Date.now() });
        return true;
    }
}

module.exports = NoPrefix;
