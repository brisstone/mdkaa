/* jshint indent: 2 */
const models = require('./index')
// console.log(models, "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzjjjjjjjjj")

module.exports = (sequelize, DataTypes) => {
    var company_visitor_field = sequelize.define(
      'company_visitor_field',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        field_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        field_type: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: 'text'
        },
        visit_type: {
            type: DataTypes.STRING(255),
            allowNull: true,
            
        },
        field_position: {
            type: DataTypes.INTEGER(30),
            allowNull: true
        },
        field_value: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null
        },
        is_required: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true
        },
        is_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true
        },
        is_default:  {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },
        company: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: 'visitorsuite_company',
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
        tableName: 'company_visitor_field'
      }
    );

    company_visitor_field.associate = function(models) {
        company_visitor_field.hasOne(models.company_visitor_field_option, {
            foreignKey: 'id',
            as: 'options'
        });   
      }

      return company_visitor_field
  };
  