/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'visitorsuite_plans_features',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        feature_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        plan1: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        plan2: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        plan3: {
            type: DataTypes.INTEGER(11),
            allowNull: true
        },
        plan4: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
        plan5: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
      },
      {
        tableName: 'visitorsuite_plans_features'
      }
    );
  };
  