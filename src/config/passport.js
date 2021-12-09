/* eslint-disable no-console */

const { Strategy, ExtractJwt } = require('passport-jwt');
const models = require('../models');
import keys from './keys';

const { visitorsuite} = models;

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = keys.secret;

module.exports = passport => {
  passport.use(
    // eslint-disable-next-line camelcase
    new Strategy(opts, (jwt_payload, done) => {
      visitorsuite.findOne({ where: { id: jwt_payload.id } })
        .then(user => {
          if (user) {
            return done(null, user);
          }
          return done(null, false);
        })
        .catch(err => console.log("lllllllllsssssa",err));
    })
  );
};
