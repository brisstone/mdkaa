/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('default_host_notif', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      company: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        references: {
          model: 'visitorsuite_company',
          key: 'id'
        }
      },
      workspace_company: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        references: {
            model: 'workspace_company',
            key: 'id'
        }
    },
    estate_house: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      references: {
          model: 'estate_house',
          key: 'id'
      }
  },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      location: {
        type: DataTypes.INTEGER(11),
        allowNull:true,
        references: {
          model: 'visitorsuite_location',
          key: 'id'
        }
      },
    }, {
      tableName: 'default_host_notif'
    });
  };
  