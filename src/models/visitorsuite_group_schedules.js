module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'visitorsuite_group_schedules',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
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
        uid: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        action: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        avatar: {
            type: DataTypes.STRING(65),
            allowNull: true,
        },
        phone_number: {
            type: DataTypes.STRING(20),
            allowNull: true,
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
        tableName: 'visitorsuite_group_schedules'
      }
    );
  };
  