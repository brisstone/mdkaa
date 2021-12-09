/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'visitorsuite_plans',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        plan_name: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true
        },
        monthly_billing: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        },
        yearly_billing: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        },
        duration: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        is_active: {
          type: DataTypes.INTEGER(11),
          allowNull: false
      }
      },
      
      {
        tableName: 'visitorsuite_plans'
      }
    );
  };
  