/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'visitor_field',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        field_id: {
            type: DataTypes.INTEGER(11),
            allowNull: true,
            references: {
                model: 'company_visitor_field',
                key: 'id'
            }
        },
        field_name: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        field_value: {
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
      },
        visitor: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: 'visitors',
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
        tableName: 'visitor_field'
      }
    );
  };
  