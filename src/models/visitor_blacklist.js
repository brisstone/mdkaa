/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    var visitor_blacklist = sequelize.define(
      'visitor_blacklist',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        phone_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        name: {
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
        visitor: {
            type: DataTypes.INTEGER(11),
            allowNull: true,
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
        tableName: 'visitor_blacklist'
      }
    );

    visitor_blacklist.associate = function(models) {
      visitor_blacklist.hasOne(models.visitors, {
          foreignKey: 'id',
          sourceKey: 'visitor',
          as: 'visitorInfo',
          constraints: false
      });   
    }

    return visitor_blacklist
  };
  