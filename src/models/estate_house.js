/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
  var estate_house =  sequelize.define(
    'estate_house',
    {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      block_no: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      features: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      location: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        references: {
          model: 'visitorsuite_location',
          key: 'id'
        }
      },
      status: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: 'vacant'
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false
      },

      estate: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        references: {
          model: 'visitorsuite_company',
          key: 'id'
        }
      }
    },
    {
      tableName: 'estate_house'
    }
  );

  estate_house.associate = function(models) {
    estate_house.hasOne(models.visitors, {
        foreignKey: 'id',
        as: 'houseVisitors'
    });   
  }

  return estate_house
};
