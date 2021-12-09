/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('staff_notif', {
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
      tableName: 'staff_notif'
    });
  };
  