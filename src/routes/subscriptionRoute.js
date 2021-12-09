const { Router } = require('express');
const passport = require('passport');
const subscriptionController = require('../controllers/subscriptionController');
const router = Router();


router.post(
  '/subscribe',
  passport.authenticate('jwt', { session: false }),
  async(req,res)=>{subscriptionController.initiatePayment(req,res)}
);
router.get('/callback', async(req,res)=>{subscriptionController.verifyPayment(req,res)});
router.get(
  '/billings',
  passport.authenticate('jwt', { session: false }),
  async(req,res)=>{subscriptionController.getBillings(req,res)}
);
router.get(
  '/plan',
  passport.authenticate('jwt', { session: false }),
  async(req,res)=>{subscriptionController.getActivePlan(req,res)}
);


module.exports = router;