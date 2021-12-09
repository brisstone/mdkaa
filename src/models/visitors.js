/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
  var visitors = sequelize.define(
    'visitors',
    {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      avatar: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      visiting_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      leaving_date: {
        type: DataTypes.DATE,
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
      short_id: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      staff: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'visitorsuite',
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
      action: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      tableName: 'visitors'
    }
  );

 

  // visitors.associate = function(models) {
  //   visitors.hasMany(models.visitorsuite, {
  //       foreignKey: 'id',
  //       as: 'host'
  //   });   
  // }

  visitors.associate = function(models) {
    visitors.hasMany(models.visitor_field, {
        foreignKey: 'visitor',
        as: 'fields',
        constraints: false
    });  
    visitors.hasMany(models.visitorsuite, {
      foreignKey: 'id',
      as: 'host',
      constraints: false
  })
     
  };

 


  return visitors
};
