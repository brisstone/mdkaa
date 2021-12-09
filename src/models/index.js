'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const models = {};

console.log(config.database)

let db = {
  sequelize: sequelize,
  Sequelize: Sequelize,
  models: {}
}

// let sequelize;
// if (config.use_env_variable) {
//   sequelize = new Sequelize(process.env[config.use_env_variable], config);
// } else {
//   sequelize = new Sequelize(config.database, config.username, config.password, config, {
//     dialect: 'mysql',
//     host: "192.168.1.2",
//     operatorAlias:false,
//     logging:false,
//     pool: {
//         max: 5,
//         idle: 30000,
//         acquire: 60000,
//     },
//     dialectOptions: {
//       socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock'
//     },
//   });
// }

var sequelize = new Sequelize(config.database, config.username, config.password,{
  host: "localhost",
  user: "brisstone",
  dialect: "mysql",
  logging: function () {},
  pool: {
      max: 5,
      min: 0,
      idle: 10000
  },
  dialectOptions: {
      socketPath: "/var/run/mysqld/mysqld.sock"
  },
  define: {
      paranoid: true
  }
});


  //test db 
  sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
   .catch(err => {
   console.error('Unable to connect to the database:', err);
  });




  
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    models[model.name] = model;
  });

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

Object.keys(models).forEach(function(modelName) {
  if (models[modelName].options.hasOwnProperty('associate')) {
    models[modelName].options.associate(models)
  }
})

sequelize.sync({force: false}).then(() => {
  console.log("Tables syncronized!!!")
})



models.sequelize = sequelize;
models.Sequelize = Sequelize;

export {sequelize}

module.exports = models;
