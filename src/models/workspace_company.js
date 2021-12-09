/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    var workspace_company = sequelize.define(
      'workspace_company',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        logo: {
          type: DataTypes.STRING(255),
          allowNull: true
      },
      location: {
        type: DataTypes.INTEGER(11),
        allowNull:true,
        references: {
          model: 'visitorsuite_location',
          key: 'id'
        }
      },
        companyemail: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        country: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        workspace: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: 'visitorsuite_company',
                key: 'id'
            }
        },
        is_active: {
            type: DataTypes.INTEGER(1),
            allowNull: false
        }
      },
      {
        tableName: 'workspace_company'
      }
    );

    workspace_company.associate = function(models) {
      workspace_company.hasOne(models.visitors, {
          foreignKey: 'id',
          as: 'companyVisitors'
      });   
    }

    return workspace_company
  };
  