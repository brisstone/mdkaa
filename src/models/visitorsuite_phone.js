/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'visitorsuite_phone',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        phone_number: {
            type: DataTypes.STRING(19),
            allowNull: false
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        user: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          references: {
            model: 'visitorsuite',
            key: 'id'
          }
        },
        phone_number2: {
          type: DataTypes.STRING(19),
          allowNull: true
        },
        company: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          references: {
              model: 'visitorsuite_company',
              key: 'id'
          }
        }
      },
      {
        tableName: 'visitorsuite_phone'
      }
    );
  };
  