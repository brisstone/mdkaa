/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define(
      'company_image_slide',
      {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        url: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        public_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
            
        },
        company: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: 'visitorsuite_company',
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
      },
      {
        tableName: 'company_image_slide'
      }
    );
  };
  