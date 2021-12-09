const bcrypt = require('bcryptjs');
const jwty = require('jwt-simple');
const models = require('../models');
const Sequelize = require('sequelize');
const shortid = require('shortid');
const path = require('path');
const { parse } = require('json2csv');
const fs = require('fs');

// Load Input Validation
const settingsController = require('./settingsController');
const validateEditStaff = require('../validation/add-staff');
const visitorsuitevents = require('../events/visitorsuitEvents');
const UserController = require('./userController');

// Load models
const { visitorsuite, visitorsuite_company, workspace_company, visitorsuite_phone } = models;
const secretKey = 'techcellent360globalsupersecretkey';
const Op = Sequelize.Op;
const baseUrl = "http://dashboard.carrotsuite.space"

const workspaceController = {

  /**
   * Add workspace company
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route POST: '/api/v1/users/workspace-companies'
   */
  async addWorkspaceCompany(req, res) {
    const { errors, isValid } = validateEditStaff(req.body);
    // Check Validation
    if (!isValid) {
      return res.status(400).json(errors);
    }
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
      if (company && company.options === 'workspace') {
        const password = shortid();
        const {
          company_name,
          first_name,
          last_name,
          email,
          phone_number,
          appointment_only
        } = req.body;
        const hashedPassword = bcrypt.hashSync(password, 8);
        if (!company_name) res.status(400).send({ message: 'company name is required' });
        const workspaceCompany = await workspace_company.create({
          name: company_name,
          is_active: 1,
          companyemail: email,
          location: req.user.location,
          workspace: company.id,
          date: Date.now()
        });
        const visitorsuite1 = await visitorsuite.create({
          company: company.id,
          email,
          workspace_company: workspaceCompany.id,
          password: hashedPassword,
          location: req.user.location,
          first_name,
          last_name,
          appointment_only,
          role: 'GLOBAL_ADMIN',
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
          workspace_company: WorkspaceCompany.id
        };

        let token1 = jwty.encode(payload, secretKey);
        const bitly = await settingsController.init(
          `${baseUrl}/api/v1/visitor/send-me-an-appointment/${token1}`
        );

        await visitorsuite.update({ link: bitly.url }, { where: { id: visitorsuite.id } });
        const vsp = await visitorsuite_phone.create({
          id: null,
          phone_number: phone_number,
          date: Date.now(),
          user: visitorsuite.id,
          company: workspaceCompany.id
        });
        visitorsuitevents.emit('sendLoginCred', visitorsuite, visitorsuite.email, password);
        console.log(password);
        return res
          .status(200)
          .send({ data: workspaceCompany, message: `${company_name} successfully added!` });
      } else {
        return res.status(400).send('invalid company option');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal sever error');
    }
  },
  /**
   * Get workspace company
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/workspace-companies'
   */
  async getCompanies(req, res) {
  
    try {
      if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        const company = await visitorsuite_company.findOne({
          where: {
            id: req.user.company
          }
        });
        if (company && company.options === 'workspace') {
          let { page, limit } = req.query;
          page = Number(page) || 1;
          limit = Number(limit) || 10;

          const offset = page * limit - limit;
          const companies = await workspace_company.findAndCountAll({
            where: {
              workspace: req.user.company,
              location: req.user.location,
              is_active: 1
            },
            limit,
            offset
          });
          return res.status(200).json({
            status: 'success',
            data: companies
          });
        } else {
          return res.status(400).send('Invalid company option');
        }
      } else {
        return res.status(400).send('Access denied!');
      }
    } catch (err) {
      console.log("uoisiasaasa",err);
      res.status(500).send('Internal server error');
    }
  },
  /**
   * Delete one workspace company
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route DELETE: '/api/v1/users/workspace-companies/:id'
   */
  async deleteCompany(req, res) {
    const { id } = req.params;
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role === 'LOCATION_ADMIN') {
        const company = await UserController.getCompany(req, res);
        if (company && company.options === 'workspace' && !req.user.workspace_company) {
          await workspace_company.destroy({
            where: { id }
          });
          return res.status(200).send({ message: 'company deleted' });
        }
        return res.status(401).send('anauthorized access');
      }
      return res.status(401).send('anauthorized access');
    } catch (err) {
      return res.status(500).send('internal server error');
    }
  },
  /**
   * Edit one workspace company
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route PUT: '/api/v1/users/workspace-companies/:id'
   */
  async editCompany(req, res) {
    const { id } = req.params;
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role === 'LOCATION_ADMIN') {
        const company = await UserController.getCompany(req, res);
        if (company && company.options === 'workspace' && !req.user.workspace_company) {
          const comp = await workspace_company.findOne({
            where: { id }
          });
          if(comp){
            await workspace_company.update(
              {
                ...req.body
              },
              {
                where: {
                  id
                }
              }
            )
            const updated = await workspace_company.findOne({
              where: { id }
            });
            return res.status(200).send({ message: 'Changes saved', data: updated });
          }
          return res.status(404).send({ message: 'company not found' });
        }
        return res.status(401).send('anauthorized access');
      }
      return res.status(401).send('anauthorized access');
    } catch (err) {
      return res.status(500).send('internal server error');
    }
  },
  /**
   * Search workspace company
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/workspace-companies/search/:search'
   */
  async searchCompany(req, res) {
    const { search } = req.params;
    const limit = 10;
    const offset = 0;
    const sanitizedSearch = search
      .trim()
      .toLowerCase()
      .replace(/[\W_]+/, '');
    try {
      const companies = await workspace_company.findAndCountAll({
        where: {
          [Op.or]: Sequelize.where(
            Sequelize.fn('lower', Sequelize.col('name')),
            'LIKE',
            `%${sanitizedSearch}%`
          )
        },
        workspace: req.user.company,
        location: req.user.location,
        order: [['name', 'ASC']],
        limit,
        offset
      });
      return res.status(200).json({
        status: 'success',
        data: companies
      });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },
  /**
   * Export to csv file companies list
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/users/workspace_companies/export'
   */
  async exportCompany(req, res) {
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
          const users = await workspace_company.findAll({
            where: {
              workspace: staff.company,
              location: staff.location
            },
            attributes: ['name', 'companyemail']
          });

          const fields = ['name', 'companyemail',];

          csv = parse(users, { fields });
          fs.writeFile(filePath, csv, function(err) {
            if (err) {
              return res.json(err).status(500);
            } else {
              setTimeout(function() {
                fs.unlink(filePath, function(err) {
                  // delete this file after 30 seconds
                  if (err) {
                    console.error(err);
                  }
                  console.log('File has been Deleted');
                });
              }, 30000);
              res.download(filePath, 'companies.csv');
            }
          });
        } else return res.status(400).send('Bad request');
      } else return res.status(400).send('Bad request');
    } catch (err) {
      console.log(err);
    }
  },
  async sendMessage(req, res){
    try {
      const {list, subject, message} = req.body;
      if(!subject || !message) return res.status(400).send('Subject and message body is required')
      for(let i=0; i<list.length; i+=1){
        const company = await workspace_company.findOne({
          where: {
            id: Number(list[i])
          }
        })
        if(company)
          await settingsController.sendEmailMessage(company.companyemail, subject, message)
        
      }
      return res.status(200).send({message: 'Message has been sent'})
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error')
    }
  },
};

module.exports= workspaceController;
