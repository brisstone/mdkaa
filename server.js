/* eslint-disable no-unused-vars */
import subdomain from 'express-subdomain';
import express from 'express';
import bodyParser from 'body-parser';
import passport from 'passport';
import cors from 'cors';
import expressOasGenerator from 'express-oas-generator';
import cron from 'node-cron';
import gooAvatar from 'goo-avatar';
import { sequelize } from './src/models';
import passportConfig from './src/config/passport';
import userRoute from './src/routes/userRoute';
import settingsRoute from './src/routes/settingsRoute';
import visitorRoute from './src/routes/visitorRoute';
import adminRoutes from "./src/routes/adminRoutes";
import subscriptionRoute from "./src/routes/subscriptionRoute";
import subscriptionController from './src/controllers/subscriptionController';
import countryRoute from './src/routes/countryRoute';
import plansRoute from './src/routes/plansRoute';
import appCountryRoute from './src/routes/appCountry';
import settingsController from './src/controllers/settingsController';
import ipadController from './src/controllers/ipadController';
import path from 'path';
import seedsController from './src/seeds';

// Set up the app with express
const app = express();
import http from 'http';
import socketIo from 'socket.io';
const server = http.createServer(app);
const io = socketIo(server);
// Create route prefixes
const prefix = '/api/v1/';

// generate api docs
expressOasGenerator.init(
  app,
  // eslint-disable-next-line func-names
  spec => {
    return spec;
  }
);

/** Test server response
 * @route /test
 */
app.get('/test', (req, res) => res.status(200).json({ message: 'Server is Up and Running' }));
app.use(cors({ credentials: true, origin: true }));
app.use(express.static('src/upload/'));
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());

// Use passport middleware
app.use(passport.initialize());

app.use(express.static(path.resolve(__dirname, '../client/build')));
app.use(express.static(path.resolve(__dirname, '../client/public')));
app.use(express.static(__dirname + '/upload'));

app.use(`${prefix}users`, userRoute);
app.use(`${prefix}settings`, settingsRoute);
app.use(`${prefix}visitor`, visitorRoute);
app.use(`${prefix}country`, countryRoute);
app.use(`${prefix}plans`, plansRoute);
app.use(`${prefix}app-country`, appCountryRoute);
app.use(`${prefix}admin`, adminRoutes);
app.use(`${prefix}subscriptions`, subscriptionRoute);

// Passport configuration
passportConfig(passport);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: "Something broke, it's not you, it's us" });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV == 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build/index.html'));
  });
}
io.on('connection', socket => {
  ipadController(socket);
});
sequelize
  .sync()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`DB Connected Successfully`);
    seedsController.seedAdmin()
    //seedsController.seedPlan();
  })
  .then(() => {
    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server Running on Port ${PORT}`);
      cron.schedule('* * * * *', () => {
        subscriptionController.checkAndUpdateSubscription();
      });
      // cron job to schedule auto sign out of visitors
      cron.schedule('40 5 * * *', () => {
        settingsController.runAutoSignOut();
      });
    });
  });

export default app;
