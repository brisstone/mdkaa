/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'visitor_welcome_message',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        message: {
            type: DataTypes.TEXT,
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
        tableName: 'visitor_welcome_message'
      }
    );
  };
  