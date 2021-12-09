/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'visit_types_config',
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
        visit_type: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        self_signout: {
          type: DataTypes.BOOLEAN,
          defaultValue: false
        },
        welcome_message: {
            type: DataTypes.ENUM('image', 'text', 'video'),
            allowNull: true
        },
        isPhoto_required: {
          type: DataTypes.BOOLEAN,
          defaultValue: true
        },
        visitor_car: {
          type: DataTypes.BOOLEAN,
          defaultValue: false
        },
        visitor_items: {
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
        tableName: 'visit_types_config'
      }
    );
  };
  