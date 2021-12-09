import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
const formidable = require('formidable');
const fs = require('fs');
const jwty = require('jwt-simple');
const models = require('../models');

const keys = require('../config/keys');
const Sequelize = require('sequelize');
const { sequelize } = require('../models');
import * as csv from 'fast-csv';
// import { Model } from 'sequelize';
const { parse } = require('json2csv');
const path = require('path');
const uploader = require('../config/cloudinary-config');
const { dataUri } = require('../config/multer-config');

// Load Input Validation
const validateRegisterInput = require('../validation/register');
const validateLoginInput = require('../validation/login');
const settingsController = require('./settingsController');
const validateEditStaff = require('../validation/add-staff');
const visitorsuitEvents = require('../events/visitorsuitEvents');
const shortid = require('shortid');
const VisitorController = require('./visitorController');



// console.log("--uu-",models)
// Load models

// const {init} =settingsController;



const {
  visitorsuite_company_plan,
  visitorsuite_plans,
  visitorsuite,
  visitorsuite_company,
  visitorsuite_phone,
  visitorsuite_invites,
  ipad_admin,
  staff_attendance,
  estate_house,
  visitorsuite_location,
  visitors,
  visitorsuite_appointment,
  default_host,
  visitor_field
} = models;


console.log(models.visitorsuite, "llllllllllllllllllllllllllllllllllllllllllllllk")


const secretKey = 'techcellent360globalsupersecretkey';
const baseUrl = 'http://dashboard.carrotsuite.space';

// const baseUrl = 'https://jaybor';
const Op = Sequelize.Op;

// sequelize.sync()

 





var UserController = module.exports = {

  /**
   * Register a new company
   * @param {object} req req obj
   * @param {object} res res obj;
   * @returns json object
   * @route POST: '/api/v1/users/sign-up'
   */
   async SignUp(req, res) {
    // console.log(body)
    const { errors, isValid } = validateRegisterInput(req.body);
    // validateRegisterInput(body);
    // Check Validation
    if (!isValid) {
      console.log(errors)
      return res.status(400).json(errors);
    }
    try {
      const hashedPassword = bcrypt.hashSync(req.body.password, 8);
      const data = req.body;
      console.log("jdjd",data)

      // check if email is already registered
      const company_name = await visitorsuite.findOne({
        where: {
          email: data.email
        }
      });
      if (company_name) {
        errors.email = 'Email already exists';
        return res.status(400).json(errors);
      } else {
      
        // create company record
        const result = await visitorsuite_company.create({
          id: null,
          name: data.company_name,
          is_active: 1,
          companyemail: data.email,
          country: '',
          date: Date.now(),
          options: data.option
        });
        // create company admin record
        const user = await visitorsuite.create({
          id: null,
          company: result.id,
          email: data.email,
          password: hashedPassword,
          first_name: data.first_name,
          last_name: data.last_name,
          role: 'GLOBAL_ADMIN',
          date: Date.now(),
          country: '',
          is_active: 1,
          appointment_only: false,
          msg_option: 0,
          notif_option: 0,
          api_key: hashedPassword
        });

        // create a default location for this company
        const location = await visitorsuite_location.create({
          name: 'Headquarter',
          address: '',
          company: result.id,
          is_active: 1,
          date: Date.now()
        });

        const payload = {
          staff: user.id,
          company: user.company
        };
        let inviteToken = jwty.encode(payload, secretKey);

        // user invite link
        const bitly = await settingsController.init(
          `${baseUrl}/api/v1/visitor/send-me-an-appointment/${inviteToken}`
        );
        await visitorsuite.update(
          {
            link: bitly.url,
            location: location.id
          },
          { where: { id: user.id } }
        );
        // create default configurations and default visitor fields for this company
        visitorsuitEvents.default.emit('createDefaultConfigs', user.company, location.id);
        visitorsuitEvents.default.emit('createDefaultFields', user.company, location.id);

        const token = jwt.sign({ id: user.id }, keys.secret, {
          expiresIn: 86400
        });

        // Initialize a Trial plan for this company
        await UserController.initPlan('Trial', result.id);
        res.status(201).json({
          status: 'success',
          message: 'Account created',
          auth: true
        });
      }
    } catch (err) {
      console.log(err)
      res.status(500).send({ errors: { company_name: 'internal server error' } });
    }
  },

 
  /**
   * User login
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @rout POST: '/api/v1/users/sign-in'
   */
  async signIn(req, res) {
    try {
      console.log('u8')
      
      const { errors, isValid } = validateLoginInput(req.body);

      // Check for validation
      if (!isValid) {
        return res.status(400).json(errors);
      }


      const num = 28
      const pee = await visitorsuite_company_plan.findOne({ where: { company: num } });
      console.log(pee, 'kkkkiu')


      // Find user by email
      // eslint-disable-next-line consistent-return
      const user = await visitorsuite.findOne({ where: { email: req.body.email} });
      // check if user exists
      // console.log('iuuiu', user)
      if (!user) {
        errors.email = 'User not found';
        return res.status(404).json(errors);
      }

      // visitorsuite_company_plan.hasMany(visitorsuite_company_plan, {foreignKey: 'visitorsuite_plans'});
      // Object.keys(models).forEach(modelName => {
      //   if (models[modelName].associate) {
      //     models[modelName].associate(models);
      //   }
      // });
      
      // Check password
      const isMatch = await bcrypt.compare(req.body.password, user.password);
     
      if (isMatch) {

        console.log('ldsssssssssss', user.company)
       
        const plan = await visitorsuite_company_plan.findOne({
          where: {
            company: user.company
          },
          include: [
            {
              model: visitorsuite_plans,
              as: 'planInfo',
              attributes: ['id', 'plan_name']
            }
          ]
        });

        console.log('hhhhhhhhhhhhhhhhhhhhhhhh', plan)

        const company = await visitorsuite_company.findOne({
          where: { id: user.company }
          
        });
        
        // currnt user payload
        const payload = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar: user.avatar,
          role: user.role,
          // plan: plan.planInfo.plan_name,
          location: user.location,
          option: company.options,
          workspace_company: user.workspace_company
        };
        // update last seen
        await visitorsuite.update({ last_seen: Date.now() }, { where: { id: user.id } });
        // Sign Token
        jwt.sign(payload, keys.secret, { expiresIn: '24h' }, (err, token) => {
          res.json({
            success: true,
            token: `Bearer ${token}`
          });
        });
      } else {
        errors.password = 'Password incorrect';
        res.status(400).json(errors);
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal server error');
    }
  },


  /**
   * Verify jwt authenticity
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/verify-token'
   */
  authenticateToken(req, res) {
    let { token } = req.params;
    if (token && token.startsWith("Bearer")) token = token.slice(7);
    jwt.verify(token, keys.secret, (err, verified) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ isAuthenticated: false });
      }
      return res.status(200).send({ isAuthenticated: true });
    });
  },


  /**
   * set company initial plan
   * @param {string} name plan name
   * @param {number} company company id
   */
  initPlan(name, company) {
    return new Promise((resolve, reject) => {
      visitorsuite_plans.findOne({
        where: {
          plan_name: name
        }
      }).then(result => {
        if (result) {
          let start_date = new Date();
          const trialDays = 14;
          console.log(start_date.getDate());
          const func = start => {
            let expire = new Date();
            expire.setDate(parseInt(start.getDate()) + parseInt(trialDays));
            return expire;
          };
          const expiring_date = func(start_date);
          // create company plan
          visitorsuite_company_plan.create({
            id: null,
            start_date,
            expiring_date: new Date(expiring_date),
            interval_remaining: parseInt(trialDays),
            plan: result.id,
            period: 'days',
            company
          }).then(result2 => {
            resolve();
          });
        } else {
          visitorsuite_company_plan.create({
            id: null,
            start_date: Date.now(),
            expiring_date: new Date('0'),
            interval_remaining: 0,
            plan: 1,
            company
          }).then(result2 => {
            resolve();
          });
        }
      });
    });
  },


  /**
   * Gets a company
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns company obj
   */
  async getCompany(req, res) {
    try {
      return await visitorsuite_company.findOne({
        where: { id: req.user.company }
      });
    } catch (err) {
      throw err;
    }
  },
  // @route GET api/v1/users/current
  // @desc Get current user
  // @access Users
  getCurrentUser(req, res) {
    visitorsuite.findOne({
      where: {
        id: req.user.id,
        is_active: 1
      }
    }).then(result => {
      result.password = '';
      result.api_key = '';
      visitorsuite_company.findOne({
        where: {
          id: result.company
        }
      }).then(result2 => {
        return res.status(200).json({
          success: 'status',
          data: {
            user: result,
            company: result2
          }
        });
      });
    });
  },


  /**
   * Edit staff profile picture
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route PUT: '/api/v1/users/edit-profile/picture'
   */
  async editProfilePicture(req, res) {
    if (!req.file) res.status(400).send('select a profile picture');
    try {
      let datauri = dataUri(req.file).content;
      let img = await uploader.upload(datauri, { folder: 'visitorsuite' });
      await visitorsuite.update({ avatar: img.url }, { where: { id: req.user.id } });

      const staff = await visitorsuite.findOne({
        where: {
          id: req.user.id
        }
      });

      // edit current user payload with edited picture
      const payload = {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        avatar: staff.avatar,
        role: staff.role
      };
      jwt.sign(payload, keys.secret, { expiresIn: 3600 }, (err, token) => {
        res.json({
          success: true,
          token: `Bearer ${token}`,
          message: 'Profile picture updated!'
        });
      });
    } catch (err) {
      res.status(500).send('Internal server error');
    }
  },


  /**
   * Get all users/staff of a company
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route GET '/api/v1/users/get'
   */
  async getAllUser(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'CARE_TAKER'
    ) {
      const company = await visitorsuite_company.findOne({
        where: {
          id: req.user.company
        }
      });
      let { page, limit, appointment_only } = req.query;
      page = Number(page) || 1;
      limit = Number(limit) || 10;
      console.log(appointment_only, 'app');

      // check if query includes appoinment only
      // this is to check if request is comming from mobile app
      // and only get staff without appointment only mode enabled
      appointment_only = appointment_only ? true : false;

      const offset = page * limit - limit;
      const data = [];
      let rows = [];
      let count = 0;
      if (company.options === 'workspace') {
        let query = {
          company: req.user.company,
          workspace_company: req.user.workspace_company,
          location: req.user.location,
          is_active: 1
        };

        if (appointment_only) {
          // dont get users with appointment only enabled
          query = {
            company: req.user.company,
            workspace_company: req.user.workspace_company,
            is_active: 1,
            appointment_only: false,
            location: req.user.location
          };
        }
        const result = await visitorsuite.findAndCountAll({
          where: query,
          attributes: ['id', 'first_name', 'last_name', 'avatar', 'assistant', 'position', 'email'],
          limit,
          offset
        });
        rows = result.rows;
        count = result.count;
      } else if (company.options === 'office') {
        let query = {
          company: req.user.company,
          location: req.user.location,
          is_active: 1
        };

        if (appointment_only) {
          // get users without appointment only
          query = {
            company: req.user.company,
            is_active: 1,
            appointment_only: false,
            location: req.user.location
          };
        }
        const result = await visitorsuite.findAndCountAll({
          where: query,
          attributes: ['id', 'first_name', 'last_name', 'avatar', 'assistant', 'position', 'email'],
          limit,
          offset
        });
        rows = result.rows;
        count = result.count;
      } else if (company.options === 'estate') {
        let query = {
          company: req.user.company,
          estate_house: req.user.estate_house,
          location: req.user.location,
          is_active: 1
        };

        if (appointment_only) {
          // dont get users with appointment only mode
          query = {
            company: req.user.company,
            location: req.user.location,
            estate_house: req.user.estate_house,
            is_active: 1,
            appointment_only: false
          };
        }
        const result = await visitorsuite.findAndCountAll({
          where: query,
          attributes: ['id', 'first_name', 'last_name', 'avatar', 'assistant', 'position', 'email'],
          include: [
            {
              model: estate_house,
              as: 'house',
              attributes: ['id', 'block_no']
            }
          ],
          distinct: true,
          limit,
          offset
        });
        return res.status(200).json({
          status: 'success',
          data: result
        });
      } else return res.status(404).send('This company option is not available yet!');

      // get staff assistant if available.
      // dont know if it's necessary in this query, but i am scared to removed it
      for (let i = 0; i < rows.length; i += 1) {
        let assistant = null;
        if (rows[i].assistant) {
          const theAssistant = await visitorsuite.findOne({
            where: { id: rows[i].assistant }
          });
          if (theAssistant) assistant = `${theAssistant.first_name} ${theAssistant.last_name}`;
        }
        data.push({
          id: rows[i].id,
          first_name: rows[i].first_name,
          last_name: rows[i].last_name,
          avatar: rows[i].avatar,
          assistant,
          email: rows[i].email,
          staff_position: rows[i].position
        });
      }
      return res.status(200).json({
        status: 'success',
        data: { rows: data, count }
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  /**
   * Get a single staff record
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/:id'
   */
  async getStaff(req, res) {
    const { id } = req.params; // staff id
    try {
      const staff = await visitorsuite.findOne({
        where: {
          id
        }
      });
      if (staff) {
        const staffPhone = await visitorsuite_phone.findOne({
          where: {
            user: staff.id
          }
        });
        let assistant = null;
        let house = null;
        // if staff has assistant, get record
        if (staff.assistant) {
          const theAssistant = await visitorsuite.findOne({
            where: { id: staff.assistant }
          });
          if (theAssistant) assistant = `${theAssistant.first_name} ${theAssistant.last_name}`;
        }
        // if estate usescase, get staff house record
        if (staff.estate_house) {
          const theHouse = await estate_house.findOne({
            where: { id: staff.estate_house }
          });
          if (theHouse) house = theHouse.block_no;
        }
        let staffCopy = {};

        // staff record
        staffCopy.id = staff.id;
        staffCopy.first_name = staff.first_name;
        staffCopy.last_name = staff.last_name;
        staffCopy.appointment_only = staff.appointment_only;
        staffCopy.email = staff.email;
        staffCopy.staff_position = staff.position;
        staffCopy.phone_number = staffPhone ? staffPhone.phone_number : '';
        staffCopy.notification = staff.msg_option;
        staffCopy.avatar = staff.avatar;
        staffCopy.assistant = assistant;
        staffCopy.house_block = house;
        staffCopy.estate_house = staff.estate_house;
        staffCopy.notif_option = staff.notif_option;

        return res.status(200).send({ data: staffCopy });
      } else {
        return res.status(404).send({ message: 'no staff found' });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).send(err);
    }
  },
  /**
   * Search staff
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET '/api/v1/users/search/:search'
   */
  async searchStaffs(req, res) {
    const { search } = req.params;
    const limit = 10;
    const offset = 0;
    const sanitizedSearch = search
      .trim()
      .toLowerCase()
      .replace(/[\W_]+/, '');
    try {
      const company = await UserController.getCompany(req, res);
      let result;
      if (company.options === 'workspace') {
        const staff = await visitorsuite.findAndCountAll({
          where: {
            [Op.or]: Sequelize.where(
              Sequelize.fn('lower', Sequelize.col('first_name')),
              'LIKE',
              `%${sanitizedSearch}%`
            ),
            company: req.user.company,
            location: req.user.location,
            workspace_company: req.user.workspace_company
          },
          order: [['first_name', 'ASC']],
          distinct: true,
          limit,
          offset
        });
        result = staff;
      } else if (company.options === 'office') {
        const staff = await visitorsuite.findAndCountAll({
          where: {
            [Op.or]: Sequelize.where(
              Sequelize.fn('lower', Sequelize.col('first_name')),
              'LIKE',
              `%${sanitizedSearch}%`
            ),
            company: req.user.company,
            location: req.user.location
          },
          order: [['first_name', 'ASC']],
          limit,
          offset
        });
        result = staff;
      } else if (company.options === 'estate') {
        const staff = await visitorsuite.findAndCountAll({
          where: {
            [Op.or]: Sequelize.where(
              Sequelize.fn('lower', Sequelize.col('first_name')),
              'LIKE',
              `%${sanitizedSearch}%`
            ),
            company: req.user.company,
            location: req.user.location,
            estate_house: req.user.estate_house
          },
          include: [
            {
              model: estate_house,
              as: 'house',
              attributes: ['id', 'block_no']
            }
          ],
          distinct: true,
          order: [['first_name', 'ASC']],
          limit,
          offset
        });
        result = staff;
      } else return res.status(404).send('this option is not available yet');
      if (result.rows.length) {
        const data = result.rows.map(item => {
          return {
            id: item.id,
            first_name: item.first_name,
            last_name: item.last_name,
            house: item.house ? item.house : '',
            location: item.location,
            email: item.email,
            avatar: item.avatar,
            staff_position: item.position
          };
        });
        return res.status(200).send({ data: { rows: data, count: result.count } });
      }
      return res.status(200).send({ data: result });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  },


  /**
   * Edit staff details
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route PUT: '/api/v1/users/edit-profile/:id'
   */
  async editStaff(req, res) {
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      const { id } = req.params; // staff id
      const data = req.body;

      const { errors, isValid } = validateEditStaff(data);
      // Check Validation
      if (!isValid) {
        return res.status(400).json(errors);
      }
      try {
        const staff = await visitorsuite.findOne({ where: { id } });
        if (staff) {
          const phone = await visitorsuite_phone.findOne({
            where: {
              user: staff.id
            }
          });
          if (phone) {
            await visitorsuite_phone.update(
              {
                phone_number: data.phone_number
              },
              {
                where: {
                  user: id
                }
              }
            );
          } else {
            await visitorsuite_phone.create({
              user: id,
              phone_number: data.phone_number,
              company: req.user.company,
              date: Date.now()
            });
          }
          await visitorsuite.update(
            {
              ...data,
              position: data.staff_position || null,
              estate_house: data.house || null
            },
            {
              where: { id }
            }
          );
          req.params.id = id;
          UserController.getStaff(req, res);
        } else {
          return res.status(404).send({ meessage: 'No staff found' });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send('internal server error');
      }
    } else {
      return res.status(401).send('Unauthorized');
    }
  },


  /**
   * delete staff
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route DELETE: '/api/v1/users/:id'
   */
  async deleteStaff(req, res) {
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      const { id } = req.params;

      const staff = await visitorsuite.findOne({
        where: { id }
      });
      if (!staff) {
        return res.status(404).send({ message: 'Record not found' });
      }
      try {
        await visitorsuite_phone.destroy({
          where: { user: id }
        });
        await ipad_admin.destroy({
          where: { staff_id: id }
        });
        await visitorsuite_appointment.destroy({
          where: {
            staff_id: id
          }
        });
        await default_host.destroy({
          where: {
            staff_id: id
          }
        });
        await UserController.deleteStaffVisitors(id);
        await visitorsuite.destroy({
          where: { id }
        });

        res.status(200).send({ message: 'Record delete!' });
      } catch (err) {
        console.log(err);
        res.status(500).send(err);
      }
    } else {
      return res.status(401).send('Unauthorized');
    }
  },


  async deleteStaffVisitors(staff_id) {
    try {
      const visitors1 = await visitors.findAll({
        where: {
          staff: staff_id
        }
      });
      for (let i = 0; i < visitors1.length; i += 1) {
        await visitor_field.destroy({
          where: {
            visitor: visitors1[i].id
          }
        });
      }
      await visitors.destroy({
        where: {
          staff: staff_id
        }
      });
    } catch (err) {
      throw err;
    }
  },


  /**
   * Bulk import staff record from csv file
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route POST: '/api/v1/users/bulk-import'
   */
  async bulkImport(req, res) {
    if (req.user.role === 'GLOBAL_ADMIN' || req.user.role === 'LOCATION_ADMIN') {
      const form = new formidable.IncomingForm();
      const files = await new Promise(function (resolve, reject) {
        form.parse(req, function (err, fields, files) {
          if (err) {
            reject(err);
            return;
          }
          resolve(files);
        });
      });
      const { staffCsv } = files; // csv file
      if (staffCsv.type !== 'text/csv')
        return res.status(400).send('Only csv files can be imported');
      let staff = [];
      csv
        .parseFile(staffCsv.path, {
          headers: true,
          ignoreEmpty: true
        })
        .on('data', function (data) {
          staff.push(data);
        })
        .on('end', function () {
          UserController.addStaff(req, res, staff);
          console.log(staff, 'jsajjjjjassass')
        });
    } else {
      return res.status(401).send('Unauthorized');
    }
  },


  /**
   * Handle imported staff record add
   * @param {object} req req obj
   * @param {object} res res obj
   * @param {array} staff staff records
   */
  async addStaff(req, res, staff) {
    try {
      for (let i = 0; i < staff.length; i += 1) {
        const password = shortid();
        const hashedPassword = bcrypt.hashSync(password, 8);
        const data = staff[i];

        // check if staff record already exist and skip
        const visitorSuite = await visitorsuite.findOne({
          where: {
            email: data.email
          }
        });

        if (!visitorSuite) {
          const visitorsuite1 = await visitorsuite.create({
            id: null,
            company: req.user.company,
            workspace_company: req.user.workspace_company,
            email: data.email,
            appointment_only: false,
            password: hashedPassword,
            first_name: data.first_name ,
            last_name: data.last_name,
            role: 'EMPLOYEE',
            date: Date.now(),
            country: req.user.country,
            location: req.user.location,
            is_active: 1,
            api_key: hashedPassword,
            position: data.staff_position,
            msg_option: 0
          });
          if (visitorsuite1) {
            const payload = {
              staff: visitorsuite1.id,
              company: visitorsuite1.company
            };

            let token1 = jwty.encode(payload, secretKey);
            const bitly = await settingsController.init(
              `${baseUrl}/api/v1/visitor/send-me-an-appointment/${token1}`
            );

            console.log('d2bitly', bitly);
            await visitorsuite.update({ link: bitly.url }, { where: { id: visitorsuite1.id } });

            const vsp = await visitorsuite_phone.create({
              id: null,
              phone_number: data.phone_number,
              date: Date.now(),
              user: visitorsuite1.id,
              company: req.user.company
            });
            visitorsuitEvents.default.emit('sendLoginCred', visitorsuite1, visitorsuite1.email, password);
          }
        }else{
          return res.status(200).send({ message: `${staff.length} Alert!! staff exists already` });
        }
      }
      return res.status(200).send({ message: `${staff.length} staff has been added` });
    } catch (err) {
      console.log(err);
    }
  },


  /**
   * Export to csv file staff list
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/export'
   */
  async bulkExportStaff(req, res) {
    try {
      const { user } = req.query;
      if (user) {
        const staff = await visitorsuite.findOne({
          where: {
            id: user
          }
        });
        if (staff) {
          const dateTime = new Date()
            .toISOString()
            .slice(-24)
            .replace(/\D/g, '')
            .slice(0, 14);

          const filePath = path.resolve(
            __dirname,
            '../../',
            'src/upload',
            'exports',
            'csv-' + dateTime + '.csv'
          );

          let csv;
          const users = await visitorsuite.findAll({
            where: {
              company: staff.company,
              location: staff.location
            },
            attributes: ['first_name', 'last_name', 'email', 'position']
          });

          const fields = ['first_name', 'last_name', 'email', 'phone_number', 'position'];

          csv = parse(users, { fields });
          fs.writeFile(filePath, csv, function (err) {
            if (err) {
              return res.json(err).status(500);
            } else {
              setTimeout(function () {
                fs.unlink(filePath, function (err) {
                  // delete this file after 30 seconds
                  if (err) {
                    console.error(err);
                  }
                  console.log('File has been Deleted');
                });
              }, 30000);
              res.download(filePath, 'staff.csv');
            }
          });
        } else return res.status(400).send('Bad request');
      } else return res.status(400).send('Bad request');
    } catch (err) {
      console.log(err);
    }
  },


  async sendMessage(req, res) {
    try {
      const { list, subject, message } = req.body;
      if (!subject || !message) return res.status(400).send('Subject and message body is required')
      for (let i = 0; i < list.length; i += 1) {
        const staff = await visitorsuite.findOne({
          where: {
            id: Number(list[i])
          }
        })
        if (staff)
          await settingsController.sendEmailMessage(staff.email, subject, message)
      }
      return res.status(200).send({ message: 'Message has been sent' })
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error')
    }
  },


  /**
   * Send a staff ivitation to accept an admin role
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route POST: '/api/v1/users/send-invite/:id'
   */
  async sendAdminInvite(req, res) {
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role === 'LOCATION_ADMIN') {
        const { role, location } = req.body;
        const { id } = req.params;
        const staff = await visitorsuite.findOne({
          where: {
            id,
            company: req.user.company
          }
        });
        if (staff) {
          const adminInvite = await visitorsuite_invites.create({
            company: req.user.company,
            location,
            staff: staff.id,
            role
          });
          const payload = {
            staff_id: staff.id,
            company_id: staff.company,
            invite_id: adminInvite.id
          };
          let token = jwty.encode(payload, secretKey);
          const link = `${baseUrl}/api/v1/users/accept-role/${token}`;
          const { url } = await settingsController.init(link);
          const globalAdmin = req.user;
          visitorsuitEvents.default.emit('sendAdminInvite', globalAdmin, staff, role, url, location);

          return res.status(200).send({ message: 'Invite successfully sent!' });
        }
        return res.status(400).send('No staff found');
      }
      return res.status(400).send('Unauthorized');
    } catch (err) {
      console.log(err);
      return res.status(500).send('Internal server error');
    }
  },


  /**
   * Download staff csv ile sample
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/staff-sample'
   */
  downloadStaffCsveSample(req, res) {
    try {
      const filePath = path.resolve(
        __dirname,
        '../../',
        'src/upload',
        'sample',
        'staff_sample.csv'
      );
      res.download(filePath, 'staff_sample.csv');
    } catch (err) {
      console.log(err);
    }
  },


  /**
   * Endpoint when staff clicks on link to accept
   * sdmin role invite, redirects to role details page
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/accept-role/:token'
   */
  async acceptInvite(req, res) {
    try {
      const { token } = req.params;

      const payload = jwty.decode(token, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };

      if (doesHaveKey(`staff_id`) && doesHaveKey(`company_id`) && doesHaveKey(`invite_id`)) {
        const invite = await visitorsuite_invites.findOne({
          where: {
            id: payload.invite_id,
            company: payload.company_id,
            staff: payload.staff_id
          }
        });
        if (invite) {
          res.redirect(`${baseUrl}/accept-role?id=${invite.id}`);
        } else {
          res.redirect(`${baseUrl}/not-found`);
        }
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal server error');
    }
  },


  /**
   * Get role invitation details
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/get-invite/:id'
   */
  async getInvite(req, res) {
    try {
      const { id } = req.params;
      const invite = await visitorsuite_invites.findOne({
        where: {
          id
        }
      });
      if (invite) {
        const staff = await visitorsuite.findOne({
          where: {
            id: invite.staff
          }
        });
        const data = {
          role: invite.role,
          email: staff.email,
          location: invite.location
        };
        return res.status(200).send({ data });
      }
      return res.status(404).send('not found');
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal server error');
    }
  },


  /**
   * Accept admin role invite
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route POST: '/api/v1/users/update-role'
   */
  async updateRole(req, res) {
    try {
      const { password, email, role, location } = req.body;
      if (!password && !email && role && !location)
        return res.status(400).send('All input fields are required');
      const hashedPassword = bcrypt.hashSync(password, 8);

      const staff = visitorsuite.update(
        {
          password: hashedPassword,
          role,
          location
        },
        {
          where: {
            email
          }
        }
      );
      if (staff) return res.status(200).send({ message: 'Role accepted' });
      return res.status(404).send('staff not found');
    } catch (err) {
      console.log(err)
      return res.status(500).send('Internal server error');
    }
  },


  /**
   * Get admin roles
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/roles'
   */
  async getRoles(req, res) {
    try {
      if (
        req.user.role === 'GLOBAL_ADMIN' ||
        req.user.role === 'LOCATION_ADMIN' ||
        req.user.role === 'FRONT_DESK_ADMIN'
      ) {
        const roles = await visitorsuite.findAll({
          where: {
            company: req.user.company,
            location: req.user.location,
            role: { [Op.not]: 'EMPLOYEE' }
          },
          attributes: ['id', 'first_name', 'last_name', 'role', 'avatar', 'email', 'last_seen']
        });
        res.status(200).send({ data: roles });
      } else {
        re.status(401).send('unathorized');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Server error');
    }
  },


  /**
   * Change an admin role
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route PUT: '/api/v1/users/role/:id'
   */
  async setRole(req, res) {
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role === 'LOCATION_ADMIN') {
        const { id } = req.params;
        if (!req.body.role) res.status(400).send('role is required');

        await visitorsuite.update(
          {
            role: req.body.role,
            location: req.body.location
          },
          {
            where: {
              id
            }
          }
        );
        return res.status(200).send({ message: 'Updated' });
      } else {
        res.status(401).send('unathorized');
      }
    } catch (err) {
      console.log(err)
      res.status(500).send('Server error');
    }
  },


  /**
   * Send staff invite link to visitor
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route POST: '/api/v1/users/invite-link'
   */
  async sendInviteLink(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).send('Invitee email is required');
      const staff = await visitorsuite.findOne({
        where: {
          id: req.user.id
        }
      });
      const payload = {
        staff: staff.id,
        company: staff.company
      };
      let token = jwty.encode(payload, secretKey);
      const link = `${baseUrl}/api/v1/visitor/send-me-an-appointment/${token}`;
      const { url } = await settingsController.init(link);
      const message = `Hello, use the link below to schedule a visit with me ${url} \n Host: ${staff.first_name
        } ${staff.last_name}`;
      const company = await UserController.getCompany(req, res);
      await settingsController.sendEmailMessage(email, `${company.name} visit schedule`, message);

      return res.status(200).send({
        message: 'Invite link sent!'
      });
    } catch (err) {
      console.log(err);
      res.status(500).send('Server error');
    }
  },


  /**
   * Get staff assistant
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/:id/assistant'
   * query: token
   */
  async getStaffAssistant(req, res) {
    try {
      const { id } = req.params; // assistant id
      const { token } = req.query; // jwt

      const payload = jwty.decode(token, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };
      if (
        doesHaveKey(`staff_id`) &&
        doesHaveKey(`id`) &&
        doesHaveKey(`short_id`) &&
        doesHaveKey(`company`)
      ) {
        const staff = await visitorsuite.findOne({
          where: {
            id
          }
        });
        if (staff) {
          const assistant = await visitorsuite.findOne({
            where: {
              id: staff.assistant
            },
            attributes: ['id', 'first_name', 'last_name', 'email']
          });
          res.status(200).send({ data: assistant });
        } else {
          res.status(404).send('Staff does not exist');
        }
      } else {
        res.status(400).send('Invalid credentails');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal server error');
    }
  },


  /**
   * Notify ipad admin when ipad goes on or off
   * @param {number} company company id
   * @param {string} message message
   * @param {number} location company location
   */
  async NotifyIpadAdmin(company, message, location) {
    try {
      const admin = await ipad_admin.findOne({
        where: {
          company,
          location
        }
      });
      if (admin) {
        const staff = await VisitorController.visitorSuiteMessageOption(admin.staff_id);

        if (staff.msg_option === 0) {
          await settingsController.sendEmailMessage(admin.email, 'Visitor ipad status', message);
        }
        const adminPhone = await visitorsuite_phone.findOne({
          where: { user: staff.id }
        });
        await settingsController.sendSMSMessage(adminPhone.phone_number, message);
      }
    } catch (err) {
      console.log(err);
    }
  },


  /**
   * update host and assistant notification option
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route PUT: '/api/v1/users/notif-option'
   */
  async updateNotifOption(req, res) {
    const { option } = req.body;
    try {
      await visitorsuite.update(
        {
          notif_option: option
        },
        {
          where: {
            id: req.user.id
          }
        }
      );
      res.status(200).send({ message: 'Changes saved' });
    } catch (err) {
      res.status(500).send('Internal server error');
    }
  },


  /**
   * Sign a staff in
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route POST: '/api/v1/users/:id/sign-in'
   */
  async staffSignIn(req, res) {
    const { id } = req.params;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN'
    ) {
      try {
        const today = new Date();
        const hrs = today.getHours();
        const min = today.getMinutes();
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

        const time_in = `${hrs} : ${min} ${ampm}`;
        const staff = await visitorsuite.findOne({
          where: {
            id,
            company: req.user.company,
            location: req.user.location
          }
        });
        if (staff) {
          await staff_attendance.create({
            date: new Date(date),
            time_in,
            staff: staff.id,
            company: staff.company,
            location: staff.location,
            workspace_company: staff.workspace_company
          });
          return res.status(200).send({ message: 'Signed in successfully!' });
        }
        return res.status(400).send('invalid staff id');
      } catch (err) {
        console.log(err);
        res.status(500).send('internal server error');
      }
    } else {
      return res.status(401).send({ message: 'unauthorized access' });
    }
  },


  /**
   * Sign a staff ou
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route POST: '/api/v1/users/:id/sign-out'
   */
  async staffSignOut(req, res) {
    const { id } = req.params;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN'
    ) {
      try {
        const today = new Date();
        const hrs = today.getHours();
        const min = today.getMinutes();
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}}`;

        const time_out = `${hrs} : ${min} ${ampm}`;
        const staff = await visitorsuite.findOne({
          where: {
            id,
            company: req.user.company,
            location: req.user.location
          }
        });
        if (staff) {
          const result = await staff_attendance.update(
            { time_out },
            {
              where: sequelize.and(
                sequelize.where(sequelize.fn('DATE', sequelize.col('date')), '=', date),
                { company: req.user.company },
                { location: req.user.location },
                { time_out: null },
                { staff: staff.id }
              )
            }
          );
          if (result) return res.status(200).send({ message: 'Signed in successfully!' });
          return res.status(400).send('No record found');
        }
        return res.status(400).send('invalid staff id');
      } catch (err) {
        res.status(500).send('internal server error');
      }
    } else {
      return res.status(401).send({ message: 'unauthorized access' });
    }
  },


  /**
   * Get a staff attendance record
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/:id/attendance'
   */
  async getstaff_attendance(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;
    const offset = page * limit - limit;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN'
    ) {
      try {
        const { id } = req.params;
        const staff = await visitorsuite.findOne({
          where: {
            id,
            company: req.user.company,
            location: req.user.location
          }
        });
        if (staff) {
          const data = await staff_attendance.findAndCount({
            where: {
              staff: id,
              company: staff.company,
              location: staff.location,
              workspace_company: staff.workspace_company
            },
            offset,
            limit
          });
          return res.status(200).send({ data });
        } else {
          return res.status(404).send('no staff found');
        }
      } catch (err) {
        console.log(err);
        res.status(500).send('internal server error');
      }
    }
  },


  /**
   * Get a staff today attendance record
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/:id/attendance/today'
   */
  async getStaffTodayAttendance(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;
    const offset = page * limit - limit;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN'
    ) {
      try {
        const { id } = req.params;
        const staff = await visitorsuite.findOne({
          where: {
            id,
            company: req.user.company,
            location: req.user.location
          }
        });
        if (staff) {
          const data = await staff_attendance.findAndCount({
            where: {
              staff: id,
              date: Date.now(),
              company: staff.company,
              location: staff.location,
              workspace_company: staff.workspace_company
            },
            offset,
            limit
          });
          return res.status(200).send({ data });
        } else {
          return res.status(404).send('no staff found');
        }
      } catch (err) {
        console.log(err);
        res.status(500).send('internal server error');
      }
    }
  },


  /**
   * Get a staff last 7 days attendance record
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/:id/attendance/week-ago'
   */
  async getStaff7daysAttendance(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;
    const offset = page * limit - limit;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN'
    ) {
      try {
        const { id } = req.params;
        let now = new Date(); //.setHours(00, 00, 00);

        //Change it so that it is 7 days in the past.
        var pastDate = now.getDate() - 7;
        now.setDate(pastDate);
        let dateTo = new Date();
        let toDate = new Date(
          `${dateTo.getMonth() + 1}-${dateTo.getDate()}-${dateTo.getFullYear()}`
        );
        const date = new Date(`${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`);

        const staff = await visitorsuite.findOne({
          where: {
            id,
            company: req.user.company,
            location: req.user.location
          }
        });

        // console.log(models, ",,,,,,,,,,,,,,,,,,,,,,,,,,lll")
        
        if (staff) {
          const data = await staff_attendance.findAndCountAll({
            where: {
              staff: id,
              date: {
                $between: [date, toDate]
              },
              company: staff.company,
              location: staff.location,
              workspace_company: staff.workspace_company
            },
            offset,
            limit
          });
          return res.status(200).send({ data });
        } else {
          return res.status(404).segtind('no staff found');
        }
      } catch (err) {
        console.log(err);
        res.status(500).send('internal server error');
      }
    }
  },


  /**
   * Get a staff date range attendance record
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/:id/attendance/date-range'
   */
  async getStaffRangeAttendance(req, res) {
    let { page, limit, from, to } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;
    const offset = page * limit - limit;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN'
    ) {
      try {
        const { id } = req.params;

        let dateFrom = new Date(from); //.setHours(00, 00, 00);

        let dateTo = new Date(to);
        let toDate = new Date(
          `${dateTo.getMonth() + 1}-${dateTo.getDate()}-${dateTo.getFullYear()}`
        );
        const date = new Date(
          `${dateFrom.getMonth() + 1}-${dateFrom.getDate()}-${dateFrom.getFullYear()}`
        );
        const staff = await visitorsuite.findOne({
          where: {
            id,
            company: req.user.company,
            location: req.user.location
          }
        });
        if (staff) {
          const data = await staff_attendance.findAndCount({
            where: {
              staff: id,
              date: {
                $between: [date, toDate]
              },
              company: staff.company,
              location: staff.location,
              workspace_company: staff.workspace_company
            },
            offset,
            limit
          });
          return res.status(200).send({ data });
        } else {
          return res.status(404).send('no staff found');
        }
      } catch (err) {
        console.log(err);
        res.status(500).send('internal server error');
      }
    }
  },


  /**
   *
   * send password reset link to user email
   * @param {obj} req req object
   * @param {obj} res res object
   * @return {obj} json obj
   * @route POST: '/api/v1/users/:email/forgot-password'
   */
  async passwordResetLink(req, res) {
    const { email } = req.params;
    try {
      const user = await visitorsuite.findOne({
        where: {
          email
        }
      });
      if (!user) return res.status(400).send('Bad request');

      const payload = {
        staff: user.id,
        company: user.company
      };
      let token = jwty.encode(payload, secretKey);
      let link = `${baseUrl}/api/v1/users/password-reset/${token}`;
      const { url } = await settingsController.init(link);

      const msg = `Hi ${user.first_name} \n
            You recently requested for a password reset. click on the
            link below to reset your password, ignore if it wasn't you. Please bear in mind
            this link will expire in 24hrs, be sure to use it right away. \n ${url}`;
      await settingsController.sendEmailMessage(
        user.email,
        'password reset at Carrotsuite OfficeManager',
        msg
      );

      return res
        .status(200)
        .send({ message: 'A link has been sent to your mail to reset your password' });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server err');
    }
  },


  /**
   * Endpoint when a user clicks on a password reset link
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/password-reset/:token'
   */
  async verifyToken(req, res) {
    console.log("makakaia ")
    const { token } = req.params;
    try {
      const payload = jwty.decode(token, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };

      if (doesHaveKey(`staff`) && doesHaveKey(`company`)) {
        const user = await visitorsuite.findOne({
          where: {
            id: payload.staff,
            company: payload.company
          }
        });
        if (user) {
          console.log("ok")
          return res.redirect(`${baseUrl}/password-reset?token=${token}`);
        }
        return res.status(400).send('broken link');
      }
      return res.status(400).send('broken link');
    } catch (err) {
      console.log(err)
      return res.status(500).send('internal server error');
    }
  },


  /**
   * Reset user password
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/password-reset'
   */
  async resetPassword(req, res) {
    const { password, token } = req.body;

    if (!password) return res.status(400).send({ message: 'enter a new password' });
    const hashedPassword = bcrypt.hashSync(password, 8);

    try {
      const payload = jwty.decode(token, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };

      if (doesHaveKey(`staff`) && doesHaveKey(`company`)) {
        await visitorsuite.update(
          { password: hashedPassword },
          {
            where: {
              id: payload.staff,
              company: payload.company
            }
          }
        );
          // staff edit
        return res.status(200).send({ message: 'password successfully reset' });
      }
      res.status(400).send('Broken link');
    } catch (err) {
      res.status(500).send('internal server error');
    }
  }
};

module.exports =UserController

