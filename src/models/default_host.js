/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'default_host',
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
        workspace_company: {
          type: DataTypes.INTEGER(11),
          allowNull: true,
          references: {
              model: 'workspace_company',
              key: 'id'
          }
      },
      estate_house: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        references: {
            model: 'estate_house',
            key: 'id'
        }
    },
        staff_id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          references: {
              model: 'visitorsuite',
              key: 'id'
          }
        },
        staff_name: {
          type: DataTypes.STRING(50),
          allowNull: false
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        avatar: {
          type: DataTypes.STRING(200),
          allowNull: true,
          defaultValue: null
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
        tableName: 'default_host'
      }
    );
  };
  