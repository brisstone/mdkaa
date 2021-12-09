const { Router } = require('express');
const passport = require('passport');
const SettingsController = require('../controllers/settingsController');
const { multerUploads } = require('../config/multer-config');
const {grantAccess} = require('../controllers/planController');
const router = Router();

// console.log(SettingsController)

router.post(
  '/fields/:visit_type',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.addCustomFields(req,res)}
);
router.put(
  '/fields/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.editCustomFields(req, res)}
);
router.delete(
  '/fields/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.deleteCustomFields(req, res)}
);
router.get(
  '/fields/:visit_type',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.getVisitTypeFields(req, res)}
);
router.post(
  '/option-fields/:visit_type',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.addCustomOptionFields(req, res)}
);
router.post(
  '/option-fields/:id/options',
  passport.authenticate('jwt', { session: false }),
 async(req, res) => { SettingsController.addCustomOption(req, res)}
);
router.delete(
  '/option-fields/:id/options',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.deleteOption(req, res)}
);
router.put(
  '/fields/:id/toggle',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.toggleField(req, res)}
);
router.post(
  '/welcome-message/:visit_type',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {
    grantAccess('custom-signin-message:add'),
    SettingsController.addWelcomeMessage(req, res)}
);
router.get(
  '/welcome-message/:visit_type',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.getVisitTypeWelcomeMessage(req, res)}
);
router.post(
  '/add-location',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {
    grantAccess('location:add'),
    SettingsController.addLocation(req, res)}
);
router.post(
  '/edit-location/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.editLocation(req, res)}
);
router.get(
  '/disable-location/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.disableLocation}
);
router.get(
  '/enable-location/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.enableLocation}
);
router.get(
  '/view-location/',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.viewAllLocation(req, res)}
);
router.get(
  '/view-disabled-location/',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.viewAllDisabledLocation(req, res)}
);
router.get(
  '/view-enabled-location/',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.viewAllEnabledLocation(req, res)}
);
router.get(
  '/get-company/',
  passport.authenticate('jwt', { session: false }),
 async(req, res) => {SettingsController.getCompany(req,res)}
);
router.put(
  '/edit-company/',
  multerUploads.single('logo'),
  passport.authenticate('jwt', { session: false }),
 async(req, res) => {SettingsController.editCompany(req, res)}
);
router.post(
  '/add-staff',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {grantAccess('staff:add'),
  SettingsController.addStaff(req, res)}
);
router.get(
  '/configurations/',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.getConfigurations(req, res)}
);
router.put(
  '/edit-configurations/',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.editConfiguration(req, res)}
);

router.put(
  `/notifcation/sms`,
  passport.authenticate('jwt', { session: false }),
 async(req, res) => {SettingsController.enableNotificationThroughSMS(req, res)}
);
router.put(
  `/notifcation/email`,
  passport.authenticate('jwt', { session: false }),
 async(req, res)  => {SettingsController.enableNotificationThroughEmail(req, res)}
);
router.put(
  `/staff-notif`,
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.saveStaffNotif(req, res)}
);
router.get(
  `/staff-notif`,
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {SettingsController.getStaffNotif(req, res)}
);
router.put(
  `/welcome-notif`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.saveWelcomeNotif(req, res)}
);
router.get(
  `/welcome-notif`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.getWelcomeNotif(req, res)}
);
router.put(
  `/default-notif`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.saveDefaultHostNotif(req, res)}
);
router.get(
  `/default-notif`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.getDefaultHostNotif(req, res)}
);
router.put(
  `/signout-time`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.saveSignoutTime(req, res)}
);
router.get(
  `/signout-time`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.getSignOutTime(req, res)}
);
router.put(
  `/invite-notif`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.saveInviteNotif(req, res)}
);
router.get(
  `/invite-notif`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.getInviteNotif(req, res)}
);
router.post(
  `/default-host`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.saveDefaultHost(req, res)}
);
router.get(
  `/default-host`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.getDefaultHost(req, res)}
);
router.delete(
  `/default-host/:id`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.removeDefaultHost(req, res)}
);
router.post(
  `/ipad-admin`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.saveIpadAdmin(req, res)}
);
router.get(
  `/ipad-admin`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.getIpadAdim(req, res)}
);
router.delete(
  `/ipad-admin/:id`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.removeIpadAdmin(req, res)}
);
router.post(
  `/welcome-images`,
  multerUploads.single('welcomeGraphic'),
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.uploadWelcomeGraphic(req, res)}
);
router.delete(
  `/welcome-images/:id`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.deleteWecomeGraphic(req, res)}
);
router.get(
  '/welcome-images/:visit_type',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.getWelcomeGraphic(req, res)}
);
router.post(
  `/slide-images`,
  multerUploads.single('file'),
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{
    grantAccess('slide-images:add'),
    SettingsController.uploadImageSlide(req, res)}
);
router.delete(
  `/slide-images/:id`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.deleteSlideImage(req, res)}
);
router.get(
  `/slide-images`,
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.getSlideImages(req, res)}
);
router.put(
  '/company-country',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.editCountry(req, res)}
);
router.post(
  '/visit-types',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{
    grantAccess('custom-signin:add'),
    SettingsController.addVisitType(req, res)}
);
router.post(
  '/visit-type-configs/:visit_type',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.saveVisitTypeConFig(req, res)}
);
router.get(
  '/visit-type-configs/:visit_type',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{SettingsController.getVisitTypeConfig(req, res)}
);


export default router;