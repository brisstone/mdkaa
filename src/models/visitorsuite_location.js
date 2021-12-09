/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'visitorsuite_location',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: true
      },
        is_active: {
            type: DataTypes.INTEGER(1),
            allowNull: false
        },
        company: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: 'visitorsuite_company',
                key: 'id'
            }
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false
        }
      },
      {
        tableName: 'visitorsuite_location'
      }
    );
};
  