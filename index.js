/* eslint-disable no-unused-vars */
import express from 'express';
import bodyParser from 'body-parser';
import passport from 'passport';
import cors from 'cors';
import expressOasGenerator from 'express-oas-generator';
import cron from 'node-cron';
import { sequelize } from './src/models';
import passportConfig from './src/config/passport';
import userRoute from './src/routes/userRoute';
import settingsRoute from './src/routes/settingsRoute';
import visitorRoute from './src/routes/visitorRoute';
import adminRoutes from "./src/routes/adminRoutes";
import subscriptionRoute from "./src/routes/subscriptionRoute";
import subscriptionController from './src/controllers/subscriptionController';
import plansRoute from './src/routes/plansRoute';
import settingsController from './src/controllers/settingsController';
import ipadController from './src/controllers/ipadController';
import path from 'path';
import seedsController from './src/seeders';
// const madge = require('madge');


const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Set up the app with express
const app = express();
import http from 'http';
import socketIo from 'socket.io';
import { resolve } from 'dns';
const server = http.createServer(app);
const io = socketIo(server);
// Create route prefixes
const prefix = '/api/v1/';

app.use(cors({
  origin: '*'
}));
// // generate api docs
// expressOasGenerator.init(
//   app,
//   // eslint-disable-next-line func-names
//   spec => {
//     return spec;
//   }
// );

/** Test server response
 * @route /test
 */
app.get('/test', (req, res) => res.status(200).json({ message: 'Server is Up and Running' }));
app.use(cors());
app.use(express.static('src/upload/'));
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());

// Use passport middleware
app.use(passport.initialize());

// app.use(express.static(path.resolve(__dirname, '../client/build')));
// app.use(express.static(path.resolve(__dirname, '../client/public')));
// app.use('/static', express.static(path.resolve(__dirname, '../client/build/static')));
// app.use(express.static(__dirname + '/upload'));


const swaggerOptions = {
  
  definition: {
    openapi:'3.0.0',
    info: {
      title: 'Visitor Suite',
      version: '1.0.0',
      description: 'Visitor Management System',
      
},
servers:[{
  url: 'http://localhost:5000/api/v1',
}]
    
  },
  apis: ['src/routes/*.js']
}


// apis: ['src/routes/*.js']

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(`${prefix}users`, userRoute);
app.use(`${prefix}settings`, settingsRoute);
app.use(`${prefix}visitor`, visitorRoute);
app.use(`${prefix}plans`, plansRoute);
app.use(`${prefix}admin`, adminRoutes);
app.use(`${prefix}subscriptions`, subscriptionRoute);

// Passport configuration
passportConfig(passport);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: "Something broke, it's not you, it's us" });
});

/**
 * @swagger
 * /:
 *  get:
 *    summary: This api is used to signin user
 *    description: This api is used to signin user
 *    responses: 
 *        200:
 *            description: test user sign-in
 */


app.get('/', (req, res)=>{
  res.send("welcome")
})

if(process.env.NODE_ENV == 'production'){
  app.get('/*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build/index.html'));
  });
}

const PORT = process.env.PORT || 5000;

io.on('connection', socket => {
  ipadController(socket);
});

sequelize
  .sync()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`DB Connected Successfully`);
    // seedsController.seedAdmin()
  })
  .then(() => {
    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server Running on Port ${PORT}`);
      // cron job to check subscription expiry
      // runs every day at 7 30 am
      cron.schedule('30 7 * * *', () => {
        subscriptionController.checkAndUpdateSubscription();
      });
      // cron job to schedule auto sign out of visitors
      // runs every dat at 5:40 am
      cron.schedule('40 5 * * *', () => {
        settingsController.runAutoSignOut();
      });
    });
  });


  // madge('path/to/app.js').then((res) => {
  //   console.log(res.circularGraph());
  // });


export default app;
