module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'visiting_purposes',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        email: {
            type: DataTypes.STRING(60),
            allowNull: true
        },
        phone_number: {
            type: DataTypes.STRING(19),
            allowNull: true
        },
        private_note: {
            type: DataTypes.TEXT,
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
      },
      {
        tableName: 'visiting_purposes'
      }
    );
  };