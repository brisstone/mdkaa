/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'country',
    {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      short_name: {
        type: DataTypes.STRING(3),
        allowNull: false,
        unique: true
      },
      flag_icon: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      flag_mini_icon: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      phone_extension: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      created_date: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      tableName: 'country'
    }
  );
};
