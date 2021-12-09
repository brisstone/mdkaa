/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'company_welcome_graphic',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        graphic: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        graphic_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
            
        },
        visit_type: {
          type: DataTypes.STRING(255),
          allowNull: true,
          
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
        tableName: 'company_welcome_graphic'
      }
    );
  };
  