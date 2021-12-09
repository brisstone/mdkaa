/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    var staff_attendance = sequelize.define(
      'staff_attendance',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        date: {
          type: DataTypes.DATE,
          allowNull: true
        },
        time_in: {
            type: DataTypes.STRING(50),
            allowNull: true
          },
        time_out: {
          type: DataTypes.STRING(50),
          allowNull: true
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
      },
      {
        tableName: 'staff_attendance'
      }
    );
    return staff_attendance
  };
  