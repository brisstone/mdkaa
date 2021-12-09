const { Router } = require('express');
const passport = require('passport');
const {getPlan} = require('../controllers/planController');
const router = Router();


router
  .route('/:name')
  .get(passport.authenticate('jwt', { session:false }), getPlan);


export default router;
