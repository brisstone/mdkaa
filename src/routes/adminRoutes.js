const { Router } = require('express');
const { isAdmin } = require('../admin/adminAuthorization');
const adminController = require('../admin/adminController');
const router = Router();

const {
  adminLogin,
  addAdmin,
  addPlan,
  getCompaniesByOption,
  getAllCompanies,
  getCompany,
  getCompaniesByStatus,
  getCompanyPlan,
  getCompanyUsers,
  getPlans,
  deleteCompany,
  disableCompany,
  enableCompany,
  enablePlan,
  disablePlan,
  getAdmins,
  deleteAdmin,
  edit,
  searchCompany,
  subscribeCompany,
  suspendPlan,
  getCompanyBillings,
  getCompanyLocations
} = adminController;


// auth route
router.post('/login', ()=>{adminLogin});
router.post('/register', isAdmin, () => {addAdmin});
router.get('/admins', isAdmin, ()=>{getAdmins})
router.delete('/admins/:id', isAdmin, ()=>{deleteAdmin})


// companies route
router.route('/companies').get(isAdmin, ()=> {getAllCompanies});
router.get('/companies/:option/option', isAdmin, () =>{getCompaniesByOption});
router.get('/companies/:status/status', isAdmin, ()=>{getCompaniesByStatus});
router.get('/companies/search/:search', isAdmin,() => {searchCompany});
router
  .route('/companies/:id')
  .get(isAdmin, ()=>{getCompany})
  .delete(isAdmin, () =>{ deleteCompany});
router.get('/companies/:id/users', isAdmin, ()=>{getCompanyUsers});
router.get('/companies/:id/plans', isAdmin, ()=>{getCompanyPlan});
router.get('/companies/:id/billings', isAdmin, ()=>{getCompanyBillings});
router.put('/companies/:id/plans', isAdmin, ()=>{suspendPlan});
router.post('/companies/:id/plans', isAdmin, ()=>{subscribeCompany});
router.get('/companies/:id/enable', isAdmin, ()=>{enableCompany});
router.get('/companies/:id/disable', isAdmin, ()=>{disableCompany});
router.get('/companies/:id/locations', isAdmin, ()=>{getCompanyLocations});


router
  .route('/plans')
  .post(isAdmin, ()=>{addPlan})
  .get(isAdmin,()=>{ getPlans});
router.put('/plans/:id', isAdmin, ()=>{edit});
router.put('/plans/:id/enable', isAdmin, ()=>{enablePlan});
router.put('/plans/:id/disable', isAdmin, ()=>{disablePlan});


router.get('/password-reset/:token', ()=>{adminController.verifyToken})
router.post('/password-reset', ()=>{adminController.resetPassword})
router.post('/:email/forgot-password', ()=>{adminController.passwordResetLink})


export default router;
