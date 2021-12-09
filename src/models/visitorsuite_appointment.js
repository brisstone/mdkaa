/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    var visitorsuite_appointment= sequelize.define(
      'visitorsuite_appointment',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        appointment_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        uid: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        apointee_name: {
            type: DataTypes.STRING(65),
            allowNull: false,
        },
        purpose: {
            type: DataTypes.STRING(65),
            allowNull: true,
            defaultValue: 'Others'
        },
        apointee_email: {
            type: DataTypes.STRING(65),
            allowNull: false,
        },
        day_of_appoint: {
            type: DataTypes.DATE,
            allowNull: false
        },
        is_active: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        time_of_appoint: {
            type: DataTypes.STRING(65),
            allowNull: false
        },
        staff_id: {
            type: DataTypes.INTEGER(11),
            allowNull: true,
            defaultValue: null,
            references: {
                model: 'visitorsuite',
                key: 'id'
            }
        },
        action: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        acknowledge: {
            type: DataTypes.INTEGER(11),
            allowNull: true,
            defaultValue: 0
        },
        attended: {
            type: DataTypes.INTEGER(11),
            allowNull: true,
            defaultValue: 0
        },
        avatar: {
            type: DataTypes.STRING(65),
            allowNull: true,
        },
        phone_number: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: null
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
      },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: new Date()
        },
        type: {
            type: DataTypes.ENUM('client','user'),
            allowNull: true,
        }
      },
      {
        tableName: 'visitorsuite_appointment'
      }
    );
    visitorsuite_appointment.associate = function(models) {
        visitorsuite_appointment.hasOne(models.visitorsuite, {
            foreignKey: 'id',
            as: 'hostInfo',
            constraints: false
        });   
      }

      return visitorsuite_appointment
  };
  