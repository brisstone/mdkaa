## Visitor-Suite
A visitor management platform. Allows you track visitors your company receives.

## PROJECT SETUP

### Development

This API is currently set to development, follow the below steps to set it up in your local environment

Clone the repo and `cd` into the project folder in your terminal, then open in your IDE

In the project root folder type `npm install` to install all dependencies.

The API makes use of [sequelize](https://sequelize.org/) and [sequelize-cli](https://github.com/sequelize/cli) to create, migrate models and interact with the database, this API also makes use of [MYSQL](mysql.com) for its database.

After install dependencies, setup mysql database on your system, navigate to src folder and type `sequelize db:create` to create a database instance.

When its done navigate to the project root directory and type `npm start` to start the server. At first, this will migrate the database, then subsequently it will sycn the database with the model.

Update API endpoint soon







