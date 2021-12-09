const { Router } = require('express');
const passport = require('passport');
const UserController = require('../controllers/userController');
const {SignUp }= require('../controllers/userController')

const workspaceController = require('../controllers/workspaceController');
const estateController = require('../controllers/estateController');
const {grantAccess} = require('../controllers/planController');
const { multerUploads } = require('../config/multer-config');
const router = Router();



/**
 * @swagger
 *  components:
 *      schemas:
 *          user:
 *              type: object
 *              properties:
 *                 email:
 *                      type: string
 *                 password:
 *                      type: string
 *         
 *  
 */





/**
 * @swagger
 * /users/verify-token/{token}:
 *  get:
 *    summary: To verify a user token
 *    
 *    parameters:
 *      - in: path
 *        name: token
 *        schema: 
 *          type: integer
 *        required: true
 *        description: Numeric token of the user to verify
 *        
 *    
 *    responses: 
 *        200:
 *            description: verify user token
 */
router.get(
  '/verify-token/:token', async(req, res) => {
    UserController.authenticateToken(req, res)
  }

);




/**
 * @swagger
 * /users/export:
 *  get:
 *    summary: This api is used to signin user
 *    description: This api is used to signin user
 *    responses: 
 *        200:
 *            description: test user sign-in
 */
router.get('/export', async(req, res) => { UserController.bulkExportStaff(req, res) });
// { UserController.bulkExportStaff(req, res) }

router.get('/workspace-companies/export', async(req, res) => { workspaceController.exportCompany(req, res) });
router.get('/roles', passport.authenticate('jwt', { session: false }), async(req, res) => { UserController.getRoles(req, res) });
router.get('/staff-sample', async(req, res) => { UserController.downloadStaffCsveSample(req, res) });


/**
 * @swagger
 * /sign-up:
 *  post:
 *    summary: This api is used to signin user
 *    description: This api is used to signin user
 *    responses: 
 *        200:
 *            description: test user sign-in
 */
router.post('/sign-up', async(req, res) => {UserController.SignUp(req, res) });



/**
 * @swagger
 * /users/sign-in:
 *  post:
 *    summary: This api is used to signin user
 *    
 *    requestBody:
 *        description: This api is used to signin user
 *        required: true
 *        content: 
 *            application/json:
 *                schema:
 *                    $ref: '#/components/schemas/user'
 *            text/plain:
 *                schema: 
 *                    type: string                   
 *    responses: 
 *        200:
 *            description: test user sign-in
 */
router.post('/sign-in', async(req, res) => UserController.signIn(req,res));


/**
 * @swagger
 * /users/{id}/assistant:
 *  get:
 *    summary: To verify a user ID
 *    
 *    parameters:
 *      - in: path
 *        name: id
 *        schema: 
 *          type: integer
 *        required: true
 *        description: Numeric ID of the user to verify
 *        
 *    
 *    responses: 
 *        200:
 *            description: test user sign-in
 */
router.get('/:id/assistant', async(req, res) => { UserController.getStaffAssistant(req, res)});

router.get(
  '/current',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.getCurrentUser(req, res) }
);
router.put(
  '/edit-profile/picture',
  multerUploads.single('profilePicture'),
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.editProfilePicture(req, res) }
);
router.get(
  '/workspace-companies',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { workspaceController.getCompanies(req, res) }
);
router.get(
  '/workspace-companies/search/:search',
  passport.authenticate('jwt', { session: false }), async(req, res) => { workspaceController.searchCompany(req, res) }
);


/**
 * @swagger
 * /users/workspace-companies/{id}:
 *  get:
 *    summary: To delete company using id
 *    
 *    parameters:
 *      - in: path
 *        name: id
 *        schema: 
 *          type: integer
 *        required: true
 *        description: Numeric ID of the company to delete
 *        
 *    
 *    responses: 
 *        200:
 *            description: To delete company using id
 */
router.delete(
  '/workspace-companies/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { workspaceController.deleteCompany(req, res) }
);


/**
 * @swagger
 * /users/workspace-companies/{id}:
 *  put:
 *    summary: To update estate using id
 *    
 *    parameters:
 *      - in: path
 *        name: id
 *        schema: 
 *          type: integer
 *        required: true
 *        description: Numeric ID of estate to update
 *        
 *    
 *    responses: 
 *        200:
 *            description: To update estate using i
 */
router.put(
  '/workspace-companies/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { workspaceController.editCompany(req, res) }
);
router.post(
  '/workspace-companies/message',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { workspaceController.sendMessage(req, res) }
);
router.get(
  '/estate-houses',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { estateController.getHouses(req, res) }
);
router.get(
  '/estate-houses/search/:search',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { estateController.searchHouse(req, res) }
);


router.delete(
  '/estate-houses/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { estateController.deleteHouse(req, res) }
);
router.post(
  '/estate-houses',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { estateController.addEstateHouse(req, res) }
);
router.get('/get', passport.authenticate('jwt', { session: false }), async(req, res) => { UserController.getAllUser(req, res) });
router.get('/:id', passport.authenticate('jwt', { session: false }), async(req, res) => { UserController.getStaff(req, res) });
router.get(
  '/search/:search',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.searchStaffs(req, res) }
);
router.put(
  '/notif-options',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.updateNotifOption(req, res) }
);
router.put(
  '/edit-profile/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.editStaff(req, res) }
);
router.delete('/:id', passport.authenticate('jwt', { session: false }), async(req, res) => { UserController.deleteStaff(req, res) });
router.post(
  '/bulk-import',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.bulkImport(req, res) }
);
router.post(
  '/send-invite/:id',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {
    grantAccess('invite-link:send'), UserController.sendAdminInvite(req, res)
  }
);
router.get('/accept-role/:token', async(req, res) => { UserController.acceptInvite(req, res) });
router.get('/get-invite/:id', async(req, res) => { UserController.getInvite(req, res) });
router.post('/update-role', async(req, res) => { UserController.updateRole(req, res) });
router.post(
  '/invite-link',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.sendInviteLink(req, res) }
);
router.put('/role/:id', passport.authenticate('jwt', { session: false }), async(req, res) => { UserController.setRole(req, res) });
router.post(
  '/workspace-companies',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { workspaceController.addWorkspaceCompany(req, res) }
);
router.post(
  '/ipad-admin',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.NotifyIpadAdmin(req, res) }
);
router.post(
  '/:id/sign-in',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.staffSignIn(req, res) }
);
router.post(
  '/:id/sign-out',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.staffSignOut(req, res) }
);
router.get(
  '/:id/attendance',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.getStaffAttendance(req, res) }
);
router.post(
  '/message',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.sendMessage(req, res) }
);
router.get(
  '/:id/attendance/week-ago',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.getStaff7daysAttendance(req, res) }
);
router.get(
  '/:id/attendance/date-range',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.getStaffRangeAttendance(req, res) }
);

router.get(
  '/:id/attendance/today',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => { UserController.getStaffTodayAttendance(req, res) }
);

router.get('/password-reset/:token', async(req, res) => { UserController.verifyToken(req, res) })

router.post('/password-reset', async(req, res) => { UserController.resetPassword(req, res) })

router.post('/:email/forgot-password', async(req, res) => { UserController.passwordResetLink(req, res) })


export default router;
