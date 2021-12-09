/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('visitorsuite_invites', {
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
      staff: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        references: {
          model: 'visitorsuite',
          key: 'id'
        }
      },
      location: {
        type: DataTypes.INTEGER(11),
        allowNull:true,
        references: {
          model: 'visitorsuite_location',
          key: 'id'
        }
      },
      role: {
        type: DataTypes.STRING(255),
        allowNull: false
      }
    }, {
      tableName: 'visitorsuite_invites'
    });
  };
  