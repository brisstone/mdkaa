/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'visitorsuite_company',
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
        companyemail: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        options: {
            type: DataTypes.ENUM('office','workspace','estate'),
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
        is_active: {
            type: DataTypes.INTEGER(1),
            allowNull: false
        }
      },
      {
        tableName: 'visitorsuite_company'
      }
    );
  };
  