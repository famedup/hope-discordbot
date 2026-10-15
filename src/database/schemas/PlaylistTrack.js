// ▛▀ cashholy (carti) ▀▜

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const BaseModel = require('../BaseModel');

class PlaylistTrack extends BaseModel {
    static init(sequelize) {
        super.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                playlistId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'playlists', key: 'id' } },
                title: { type: DataTypes.STRING, allowNull: false },
                identifier: { type: DataTypes.STRING, allowNull: false },
                author: { type: DataTypes.STRING, allowNull: false },
                length: { type: DataTypes.BIGINT, allowNull: false },
                uri: { type: DataTypes.STRING, allowNull: false },
                artworkUrl: { type: DataTypes.STRING, allowNull: true },
            },
            {
                sequelize,
                modelName: 'PlaylistTrack',
                tableName: 'playlist_tracks',
                timestamps: false,
            }
        );

        return this;
    }

    static associate(models) {
        this.belongsTo(models.Playlist, {
            foreignKey: 'playlistId',
            as: 'playlist',
        });

        if (models.Playlist) {
            this.setupParentTouch('playlistId', models.Playlist, 'updatedAt');
        }
    }
}

module.exports = PlaylistTrack;
