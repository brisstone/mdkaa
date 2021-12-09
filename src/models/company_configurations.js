/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'company_configurations',
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
      self_signout: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      exhibition_mode: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      auto_signout_all: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      host_notif: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      require_pre_reg: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      visitor_notif: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      signin_verification: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      frontdesk_notif: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isPhoto_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
      tableName: 'company_configurations'
    }
  );
};
