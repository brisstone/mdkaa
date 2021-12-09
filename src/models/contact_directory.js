/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'contact_directory',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: true
        },
        email: {
          type: DataTypes.STRING(100),
          allowNull: true
        },
        type: {
            type: DataTypes.STRING(100),
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
        location: {
          type: DataTypes.INTEGER(11),
          allowNull:true,
          references: {
            model: 'visitorsuite_location',
            key: 'id'
          }
        }
      },
      {
        tableName: 'contact_directory'
      }
    );
  };
  