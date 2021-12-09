/* jshint indent: 2 */

const models = require('./index')

// console.log('kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk', models)

module.exports = (sequelize, DataTypes) => {
    var visitorsuite_company_plan = sequelize.define(
      'visitorsuite_company_plan',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        expiring_date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        interval_remaining: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
        },
        previous_plan: {
            type: DataTypes.INTEGER(11),
            allowNull: true,
            references: {
                model: 'visitorsuite_plans',
                key: 'id'
            }
        },
        plan: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: 'visitorsuite_plans',
                key: 'id'
            }
        },
        period: {
          type: DataTypes.ENUM('month', 'year', 'days'),
          allowNull: true
      },
      authorization_code: {
        type: DataTypes.STRING(255),
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
        tableName: 'visitorsuite_company_plan'
      },
      
    );

    visitorsuite_company_plan.associate = function(models) {
      // associations can be defined here
      visitorsuite_company_plan.hasOne(models.visitorsuite_plans,
        {
          foreignKey: "id",
          as: 'planInfo',
          constraints: false
        }
        );
   }

    return visitorsuite_company_plan
  };
  