const { Router } = require('express');
const passport = require('passport');
const VisitorController = require('../controllers/visitorController');
const {grantAccess} = require('../controllers/planController');
const { multerUploads } = require('../config/multer-config');
const router = Router();

// console.log("kkk" ,VisitorController)

router.get('/export', async(req, res) => {VisitorController.exportTodaysInvites(req, res)});
router.get('/log/export', async(req, res)=>{VisitorController.exportVisitors(req, res)});
router.get(
  '/purpose-field',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getPurposeField(req, res)}
);
router.get(
  '/staff',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getStaffVisitors(req, res)}
);
router.get(
  '/get/week-ago-visitors',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getLast7DaysVisitors(req, res)}
);
router.get(
  '/get/signed-in-visitors',
  passport.authenticate('jwt', { session: false }),
 async(req, res)=>{ VisitorController.getSignedInVisitors(req, res)}
);
router.get(
  '/get/date-range-visitors',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getVisitorsByDate(req, res)}
);
router.get(
  '/purposes/:purpose',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getVisitorsByPurpose(req, res)}
);
router.get(
  '/hosts/:host',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getVisitorsByHost(req, res)}
);
router.post(
  '/blacklist',
  passport.authenticate('jwt', { session: false }),
 async(req, res)=>{ VisitorController.blackListVisitors(req, res)}
)
router.get(
  '/blacklist',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getBlacklistedVisitors(req, res)}
)
router.delete(
  '/blacklist/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.removeBlacklistedVisitor(req, res)}
)
router.post(
  '/message',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.sendMessage(req, res)}
)
router.post(
  '/directory',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.addOneDirectory(req, res)}
)
router.post(
  '/directory/import',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.importDirectory(req, res)}
)
router.get(
  '/directory',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getDirectoryRecord(req, res)}
)
router.get(
  '/directory/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getOneDirectoryRecord(req, res)}
)
router.put(
  '/directory/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.editDirectoryRecord}
)
router.delete(
  '/directory/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.deleteDirectoryRecord(req, res)}
)
router.get(
  '/directory/search/:search',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.searchDirectory(req, res)}
)
router.get('/directory-sample', async(req, res)=>{VisitorController.downloadDirectoryCsveSample(req, res)});
router.get('/contact-sample', async(req, res)=>{VisitorController.downloadContactCsveSample(req, res)});
router.get('/invite-sample', async(req, res)=>{VisitorController.downloadInviteSample(req, res)});
router.get('/', passport.authenticate('jwt', { session: false }),async(req, res)=>{ VisitorController.getVisitors(req, res)});
router.get(
  '/verify-if-new-visitor/:phone_number/:visit_type',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.checkNewVisitor(req, res)}
);
router.get(
  '/current/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.showCurrentVisitor(req, res)}
);
router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.deleteVisitor(req, res)}
);
router.get('/action/:id', async(req, res)=>{VisitorController.showCurrentVisitor(req, res)});
router.post('/action/set', async(req, res)=>{VisitorController.sendCurrentVisitorAction(req, res)});
router.get('/e-barge/:token', async(req, res)=>{VisitorController.validateToken(req, res)});
router.get('/get-e-barge/:token', async(req, res)=>{VisitorController.getBargeDetails(req, res)});
router.put('/:id/decline', async(req, res)=>{VisitorController.declineVisitor(req, res)});
router.put('/:id/transfer/:assistantId', async(req, res)=>{VisitorController.transferVisitor(req, res)});

router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.registerVisitor(req, res)}
);
router.get(
  '/stats',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getVisitorsStats(req, res)}
);
router.get(
  '/general-stats',
  passport.authenticate('jwt', { session: false }),
  async(req,res)=>{VisitorController.generalStats(req, res)}
);
router.get(
  '/monthly-stats',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getVisitorsByMonth(req, res)}
);
router.get(
  '/last-month-stats',
  passport.authenticate('jwt', { session: false }),
  async (req, res)=>{VisitorController.lastMonthWeeklyStats(req, res)}
);
router.get(
  '/most-visited',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.mostVisited(req, res)}
);
router.get(
  '/busiest-stats',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getBusiestData(req, res)}
);
router.get('/:id', async(req, res)=>{VisitorController.getVisitorById(req, res)});
router.get(
  '/ext/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getVisitorByShortId(req, res)}
);
router.put(
  '/leaving/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.editVisitorLastSeenById(req, res)}
);
router.put(
  '/leaving/ex/:id',
  async(req, res)=>{VisitorController.editVisitorLastSeenByShortId(req, res)}
);
router.post(
  '/picture/:id',
  multerUploads.single('visitorPicture'),
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.editVisitorPicture(req, res)}
);
router.post('/appointment/:who', async(req, res)=>{VisitorController.setAcknowledgeAppointment(req, res)});
router.get('/appointment/:who', async(req, res)=> {VisitorController.acknowledgeAppointment(req, res)});
router.get('/appointment/formdata/:who', async(req, res)=>{VisitorController.getDataFormat(req, res)});
router.get('/schedule/formdata/:who/:purpose', async(req, res)=>{VisitorController.getScheduleFormData(req, res)});
router.post('/schedule/:who', async(req, res) => {VisitorController.aClientOfficeScheduled(req, res)});
router.get('/purpose/:token', async(req, res)=>{VisitorController.getCompanyPurposeField(req, res)});
router.post(
  '/appointment/picture/:who',
  multerUploads.single('visitorPicture'),
  async(req, res)=>{VisitorController.setPicutreAfterAcknowledge(req, res)}
);
router.post(
  '/set-appointment/',
  passport.authenticate('jwt', { session: false }),
  
 async(req, res)=>{ grantAccess('invite:schedule'), VisitorController.setAppointment(req, res)}
);
router.post(
  '/set-appointment-date/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.setDate(req, res)}
);

router.get('/send-me-an-appointment/:who', async(req, res)=>{VisitorController.aClientScheduled(req, res)});
//router.get('/send-me-an-appointment/:who', VisitorController.getDataFormat2);
router.get(
  '/view-all/scheduled-appointment',
  passport.authenticate('jwt', { session: false }),
 async(req, res)=>{ VisitorController.clientScheduledAppointments(req, res)}
);
router.get(
  '/view-all/scheduled-appointment/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.clientScheduledAppointment(req, res)}
);
router.get('/acknowledge/scheduled-appointment/:id', async(req, res)=>{VisitorController.viewVisitorSchedule(req, res)});
router.get('/get/scheduled-appointment/:id', async(req, res)=>{VisitorController.getVisitorSchedule(req, res)});
router.delete(
  '/decline/scheduled-appointment/:id',
  async(req, res)=>{VisitorController.declineVisitorSchedule(req, res)}
);
router.put(
  '/accept/scheduled-appointment/:id',
  async(req, res)=>{VisitorController.acknowledgeVisitorSchedule(req, res)}
);
router.post(
  '/group-scheduling/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.creategroupScheduling(req, res)}
);
router.get(
  '/cancel/all/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.cancelAllAppointmentWithOneClick(req, res)}
);

router.get('/get/visitor/appointment/:who', async(req, res)=>{VisitorController.getVisitorAppointment(req, res)});
router.get(
  '/get/appointment/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getAllAppointment(req, res)}
);
router.get(
  '/get/appointment/active',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getAllActiveAppointment(req, res)}
);
router.get(
  '/get/asset/appointment/:id',
  passport.authenticate('jwt', { session: false }),
 async(req, res)=>{ VisitorController.getStaffAppointments(req, res)}
);
router.get(
  '/get/asset/appointment/active/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getStaffActiveAppointments(req, res)}
);
router.get(
  '/get/today-appointment',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getAllTodayAppointments(req, res)}
);
router.post(
  '/get/today-appointments',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getAllAppointmentByDate(req, res)}
);
router.post(
  '/get/month-appointment',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getAllAppointmentByMonth(req, res)}
);
router.post(
  '/get/week-appointment',
  passport.authenticate('jwt', { session: false }),
 async(req, res)=>{ VisitorController.getAllAppointmentByWeek(req, res)}
);
router.get(
  '/get/un/appointment',
  passport.authenticate('jwt', { session: false }),
async(req, res)=>{VisitorController.getPastNotAcknowledgeAppointments(req, res)}
);
router.get(
  '/get/week-ago-appointment',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getLast7DaysAppointments(req, res)}
);
router.get(
  '/get/date-range-appointment',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getDateRangeAppointments(req, res)}
);

router.get(
  '/get/u/appointment',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.showAllAppointment(req, res)}
);
router.get(
  '/get/u/appointment/active',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.showActiveAppointment(req, res)}
);
router.get(
  '/get/u/today-appointment/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{ grantAccess('invite-list:read'),
  VisitorController.showAppointmentsByToday(req, res)}
);
router.get(
  '/get/all-invites',
  passport.authenticate('jwt', { session: false }),
  //grantAccess('invite-list:read'),
  async(req, res)=>{VisitorController.getAllInvites(req, res)}
);
router.post(
  '/get/u/today-appointment/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.showAppointmentsByDate(req, res)}
);
router.post(
  '/get/u/month-appointment/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.showAppointmentsByMonth(req, res)}
);
router.get(
  '/get/u/week-appointment/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.showAppointmentsByMonth(req, res)}
);
router.get(
  '/get/u/un/appointment/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.showPastNotAcknowledgedAppointments(req, res)}
);

router.get(
  '/acknowledged/appointment',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.viewAcknowledgedAppointments(req, res)}
);
router.get(
  '/attend/appointment/:id',
  passport.authenticate('jwt', { session: false }),
 async(req, res) => {VisitorController.attendAppointment(req, res)}
);
router.post(
  '/edit/attend/appointment/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.editAttendAppointmentPicture(req, res)}
);
router.post(
  '/all/attend/appointment/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.viewAttendedAppointment(req, res)}
);
router.post(
  '/u/all/attend/appointment/',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.showUserAttendedAppointment(req, res)}
);
router.post(
  '/cancel/appointment/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.cancelAppointment(req, res)}
);
router.get(
  '/search/:search',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.searchVisitors(req, res)}
);
router.get(
  '/appointment/search/:search',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.searchAppointments(req, res)}
);
router.post(
  '/import',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.bulkImportInvites(req, res)}
);
router.get(
  '/:phone_number/history',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getVisitorHisitory(req, res)}
);
router.post(
  '/bulk-import',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.bulkImport(req, res)}
);
router.get(
  '/welcome-message/:visit_type',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getWelcomeMessage(req, res)}
);
router.post(
  '/emergencies',
  passport.authenticate('jwt', { session: false }),
 async(req, res)=>{ VisitorController.alertVisitorsInEmergencies(req, res)}
);
router.post(
  '/:short_id/recurring-visit',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.setRecurringVisit(req, res)}
);
router.get(
  '/:short_id/recurring-visit',
  passport.authenticate('jwt', { session: false }),
  async(req, res)=>{VisitorController.getRecurringVisit(req, res)}
);


export default router;