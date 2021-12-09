/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    var company_billing= sequelize.define(
      'company_billing',
      {
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
        amount: {
            type: DataTypes.INTEGER(255),
            allowNull: false
          },
        payment_status: {
          type: DataTypes.ENUM('paid', 'cancelled'),
          allowNull: false
        },
        plan: {
          type: DataTypes.INTEGER(11),
          allowNull: true,
          defaultValue: null,
          references: {
            model: 'visitorsuite_plans',
            key: 'id'
          }
        },
        transaction_ref: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false
          },
        period: {
          type: DataTypes.ENUM('month', 'year'),
          allowNull: true
        }
      },
      {
        tableName: 'company_billing'
      }
    );

    company_billing.associate = function(models) {
      company_billing.hasOne(models.visitorsuite_plans, {
          foreignKey: 'id',
          as: 'billingPlan',
          constraints: false
      });   
    }

    return company_billing
  };
  