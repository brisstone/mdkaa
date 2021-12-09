/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    var company_visitor_field_option =  sequelize.define(
      'company_visitor_field_option',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        option_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        color: {
          type: DataTypes.STRING(255),
          allowNull: true
      },
        field: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: 'company_visitor_field',
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
        tableName: 'company_visitor_field_option'
      }
    );
      
    company_visitor_field_option.associate = function(models) {
      company_visitor_field_option.belongsTo(models.company_visitor_field, 
        {foreignKey: 'id',
        as: 'options'
    });   
    }

   

  return company_visitor_field_option
  };
  