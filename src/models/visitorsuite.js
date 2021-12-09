/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    var visitorsuite = sequelize.define(
      'visitorsuite',
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
        email: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        password: {
            type: DataTypes.STRING(64),
            allowNull: false
        },
        first_name: {
            type: DataTypes.STRING(30),
            allowNull: true
        },
        last_name: {
            type: DataTypes.STRING(30),
            allowNull: true
        },
        assistant: {
          type: DataTypes.INTEGER(11),
          allowNull: true
      },
      appointment_only: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true
    },
        role: {
            type: DataTypes.ENUM('ROLE_PARENT','ROLE_PARENT_USERS', 'GLOBAL_ADMIN',
            'LOCATION_ADMIN', 'FRONT_DESK_ADMIN', 'DELIVERY_ADMIN', 'SECURITY_ADMIN',
            'BILLING_ADMIN','EMPLOYEE', 'CARE_TAKER', 'TENANT', 'STUDENT'),
            allowNull: false
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        country: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        avatar: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        sex: {
            type: DataTypes.STRING(10),
            allowNull: true
        },
        is_active: {
            type: DataTypes.INTEGER(1),
            allowNull: false
        },
        last_seen: {
            type: DataTypes.DATE,
            allowNull: true
        },
        api_key: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        location: {
          type: DataTypes.INTEGER(11),
          allowNull:true,
          references: {
            model: 'visitorsuite_location',
            key: 'id'
          }
        },
        position: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        msg_option: {
          type: DataTypes.INTEGER(11),
          allowNull:false
        },
        notif_option: {
          type: DataTypes.INTEGER(11),
          allowNull:true,
          defaultValue: 0
        },
        link: {
          type: DataTypes.STRING(255),
          allowNull:true
        }
      },
      {
        tableName: 'visitorsuite'
      }
    );
    
    visitorsuite.associate = function(models) {
      visitorsuite.belongsTo(models.estate_house, {
          foreignKey: 'id',
          as: 'house'
      });   
    }

    return visitorsuite

};
  