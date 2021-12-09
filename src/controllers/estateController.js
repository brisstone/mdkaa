const bcrypt = require('bcryptjs');
const jwty = require('jwt-simple');
const models = require('../models');
const Sequelize = require('sequelize');
const shortid = require('shortid');

// Load Input Validation
const settingsController = require('./settingsController');
const validateEditStaff = require('../validation/add-staff');
const visitorsuitEvents = require('../events/visitorsuitEvents');
const UserController = require('./userController');

// Load models
const { visitorsuite, visitorsuite_company, estate_house, visitorsuite_phone } = models;
const secretKey = 'techcellent360globalsupersecretkey';
const Op = Sequelize.Op;
const baseUrl = "http://dashboard.carrotsuite.space"

const estateController = {

  /**
   * Add estate house
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route POST: '/api/v1/users/estate-houses'
   */
  async addEstateHouse(req, res) {
    const { errors, isValid } = validateEditStaff(req.body);
    // Check Validation
    if (!isValid) {
      return res.status(400).json(errors);
    }
    if (!req.body.block_no) res.status(400).send({ message: 'House numbering is required' });
    try {
      const isEmail = await visitorsuite.findOne({
        where: {
          email: req.body.email
        }
      });
      if (isEmail) return res.status(400).send('Email already exisit');

      const company = await visitorsuite_company.findOne({
        where: {
          id: req.user.company
        }
      });
      if (company && company.options === 'estate') {
        const password = shortid();
        const {
          block_no,
          features,
          first_name,
          last_name,
          email,
          phone_number,
          appointment_only
        } = req.body;
        const hashedPassword = bcrypt.hashSync(password, 8);

        const estateHouse = await estate_house.create({
          block_no,
          features,
          location: req.user.location,
          estate: company.id,
          date: Date.now()
        });
        const visitorsuite1 = await visitorsuite.create({
          company: company.id,
          location: req.user.location,
          email,
          estate_house: estateHouse.id,
          password: hashedPassword,
          appointment_only,
          first_name,
          last_name,
          role: 'CARE_TAKER',
          date: Date.now(),
          country: company.country,
          is_active: 1,
          msg_option: 0,
          notif_option: 0,
          api_key: hashedPassword
        });

        const payload = {
          staff: visitorsuite1.id,
          company: visitorsuite1.company,
          estate_house: estateHouse.id
        };

        let token1 = jwty.encode(payload, secretKey);
        const bitly = await settingsController.init(
          `${baseUrl}/api/v1/visitor/send-me-an-appointment/${token1}`
        );

        await visitorsuite.update({ link: bitly.url }, { where: { id: visitorsuite1.id } });
        const vsp = await visitorsuite_phone.create({
          id: null,
          phone_number: phone_number,
          date: Date.now(),
          user: visitorsuite1.id,
          company: estateHouse.id
        });
        visitorsuitEvents.default.emit('sendLoginCred', visitorsuite1, visitorsuite1.email, password);
        console.log(password);
        return res
          .status(200)
          .send({ data: estateHouse, message: `${block_no} successfully added!` });
      } else {
        return res.status(400).send('invalid company option');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal sever error');
    }
  },


  /**
   * get estate houses
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/estate-houses'
   */
  async getHouses(req, res) {
    try {
      if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        const company = await visitorsuite_company.findOne({
          where: {
            id: req.user.company
          }
        });
        if (company && company.options === 'estate') {
          let { page, limit } = req.query;
          page = Number(page) || 1;
          limit = Number(limit) || 10;

          const offset = page * limit - limit;
          const houses = await estate_house.findAndCountAll({
            where: {
              estate: req.user.company,
              location: req.user.location
            },
            limit,
            offset
          });
          return res.status(200).json({
            status: 'success',
            data: houses
          });
        } else {
          return res.status(400).send('Invalid company option');
        }
      } else {
        return res.status(400).send('Access denied!');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal server error');
    }
  },


  /**
   * Delete single estate house
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route DELETE: '/api/v1/users/estate-houses/:id'
   */
  async deleteHouse(req, res) {
    const { id } = req.params;
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role === 'LOCATION_ADMIN') {
        const company = await UserController.getCompany(req, res);
        if (company && company.options === 'estate' && !req.user.estate_house) {
          await estate_house.destroy({
            where: { id }
          });
          return res.status(200).send({ message: 'house deleted' });
        }
        return res.status(401).send('anauthorized access');
      }
      return res.status(401).send('anauthorized access');
    } catch (err) {
      return res.status(500).send('internal server error');
    }
  },

  
  /**
   * Search estate house
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/estate-houses'
   */
  async searchHouse(req, res) {
    const { search } = req.params;
    const limit = 10;
    const offset = 0;
    const sanitizedSearch = search
      .trim()
      .toLowerCase()
      .replace(/[\W_]+/, '');
    try {
      const houses = await estate_house.findAndCountAll({
        where: {
          [Op.or]: Sequelize.where(
            Sequelize.fn('lower', Sequelize.col('block_no')),
            'LIKE',
            `%${sanitizedSearch}%`
          )
        },
        location: req.user.location,
        order: [['block_no', 'ASC']],
        limit,
        offset
      });
      return res.status(200).json({
        status: 'success',
        data: houses
      });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  }
};

module.exports = estateController;
