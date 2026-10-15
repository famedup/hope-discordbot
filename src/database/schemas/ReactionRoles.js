//
//  Made with care by cashholy (carti)
//

const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ReactionRoles = sequelize.define('ReactionRoles', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  guildId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'unique_guild_message'
  },
  messageId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'unique_guild_message'
  },
  channelId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  embedTitle: {
    type: DataTypes.STRING,
    defaultValue: 'Reaction Roles'
  },
  embedDescription: {
    type: DataTypes.TEXT,
    defaultValue: 'React to get a role!'
  },
  embedColor: {
    type: DataTypes.INTEGER,
    defaultValue: 5793266 // Default blue
  },
  embedThumbnailUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emojiRolePairs: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of {emoji, roleId, roleLabel} objects'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ReactionRoles',
  timestamps: true
});

module.exports = ReactionRoles;
