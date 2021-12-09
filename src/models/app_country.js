/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'app_country',
    {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      country: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        references: {
          model: 'country',
          key: 'id'
        }
      },
      currency: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      currency_symbol: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      created_date: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      tableName: 'app_country'
    }
  );
};
