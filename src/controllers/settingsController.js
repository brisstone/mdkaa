const bcrypt = require('bcryptjs');
//const mailgun = require('mailgun-js');
const shortid = require('shortid');
const { BitlyClient } = require('bitly');
const jwty = require('jwt-simple');
const Twilio = require('twilio');
const models = require('../models');
const cron = require('node-cron');
const Sequelize = require('sequelize');
const request = require('request');


// Load Input Validation
const validateAddStaff = require('../validation/add-staff');
// const visitorsuitEvents = require('../events/visitorsuitEvents');
// const {UserController} = require('./userController');
const uploader = require('../config/cloudinary-config');
const { dataUri } = require('../config/multer-config');
const baseUrl = "http://dashboard.carrotsuite.space"
const events = require('events');

const {UserControllerClone} = require('./userControllerClone');

// console.log('ssssssssssssssssssss', UserController)


const visitorsuitEvents = new events.EventEmitter();
visitorsuitEvents.on('sendLoginCred', sendLoginCredentials);


async function sendLoginCredentials (staff, email, password){
  try {
    const company = await visitorsuite_company.findOne({
      where: { id: staff.company }
    });
    const msg = `Hello ${
      staff.first_name
    }, <br /> You have been invited to join Carrotsuite Space at ${
      company.name
    }... <br /> Carrotsuite Space will digitize visitor sign-in and host notification at ${
      company.name
    }. <br /> <br /> Your login credentials are: <br /> email: ${email} <br /> password: ${password} <br /> Proceed to login at http://www.carrotsuite.space`

    await settingsController.sendEmailMessage(staff.email, 'Carrotsuite Space | Login details', msg);
  } catch (err) {
    console.log(err);
  }
}


// Load models
const {
  visitorsuite,
  visitorsuite_company,
  visitorsuite_phone,
  visitorsuite_location,
  company_configurations,
  visitors,
  staff_notif,
  visitorsuite_jobs,
  invite_notif,
  default_host,
  default_host_notif,
  company_visitor_field,
  company_visitor_field_option,
  ipad_admin,
  company_welcome_graphic,
  company_image_slide,
  visit_types_config,
  visitor_welcome_message,
  welcome_notif
} = models;


const Op = Sequelize.Op;
const apiKey = '81dc6f4a66e4a4259e8550e60bd013f1-acb0b40c-f6b2a0f7';
const domain = 'sandboxc8dce057866148529be3e862f9bc9857.mailgun.org';
const secretKey = 'techcellent360globalsupersecretkey';

const twilioNumber = '+12185273489';
const accountSid = 'AC5a76349f1a920cb593049e3b1dfd24e7';
const authToken = '767e01e5dac0dc27cf5b8d4d9d9b6a32';
const Twiloauth= '13505faee4b318461274eacb20a875a2';
const Twilosid = "ACe5b30f7708a39f0de2d72f232d01f3c1";
const client = Twilio(Twilosid, Twiloauth);
// const client = Twilio(accountSid, authToken);
const bitly = new BitlyClient(`ac287b40548c027eeb3e7bc6e552fe89787bb0a6`, {});
//const mail = mailgun({ apiKey, domain });

const settingsController = {

 
  /**
   * Shortens a link
   * @param {string} link link to shorten
   * @returns  promise object with shortened link
   */
  init: async (link) =>{
    let result;
    try {
      result = await bitly.shorten(link);
      // console.log("reeeqqqqqqqqqqqeeee", result)
    } catch (e) {
      throw e;
    }
    return result;
  },

  // async sendLoginCredentials(staff, email, password) {
  //   try {
  //     const company = await visitorsuite_company.findOne({
  //       where: { id: staff.company }
  //     });
  //     const msg = `Hello ${
  //       staff.first_name
  //     }, <br /> You have been invited to join Carrotsuite Space at ${
  //       company.name
  //     }... <br /> Carrotsuite Space will digitize visitor sign-in and host notification at ${
  //       company.name
  //     }. <br /> <br /> Your login credentials are: <br /> email: ${email} <br /> password: ${password} <br /> Proceed to login at http://www.carrotsuite.space`
  
  //     await settingsController.sendEmailMessage(staff.email, 'Carrotsuite Space | Login details', msg);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // },


  /**
   * Enables a staff email notification
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/notification/email'
   */
  enableNotificationThroughEmail(req, res) {
    visitorsuite.update(
      {
        msg_option: 0
      },
      { returning: true, where: { id: req.user.id, is_active: 1 } }
    ).then(() => {
      return res.status(200).send({ message: 'Notification changed to email' });
    });
  },


  /**
   * Enable notification through SMS
   * @param {obj} req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/notification/sms'
   */
  enableNotificationThroughSMS(req, res) {
    visitorsuite.update(
      {
        msg_option: 1
      },
      { returning: true, where: { id: req.user.id } }
    ).then(() => {
      return res.status(200).send({ message: 'Notification changed to sms' });
    });
  },


  /**
   * Add custom field for a visit type
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route POST: '/api/v1/settings/fields/:visit_type'
   */
  addCustomFields(req, res) {
    const { name, is_required, is_enabled } = req.body;
    const { visit_type } = req.params;

    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      if (!name) return res.status(400).send('custom field name is required');
      company_visitor_field.create({
        company: req.user.company,
        location: req.user.location,
        field_name: name,
        is_enabled,
        visit_type,
        is_required
      }).then(result => {
        return res.status(200).send({ data: result, message: 'Custom field added' });
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  editCustomFields(req, res) {
    const { id } = req.params;
    const { name } = req.body;
    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      company_visitor_field.findOne({
        where: {
          id,
          company: req.user.company
        }
      }).then(result => {
        if (result) {
          if (name > 1) {
            company_visitor_field.update({ field_name: name }, { where: { id } }).then(() => {
              return res.status(200).send({ message: 'Field updated' });
            });
          } else {
            return res.status(200).send('Field name is required');
          }
        } else {
          return res.status(400).send('Field not found');
        }
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  /**
   * Toggle field as enabled/disabled, required/unrequired for a visit type
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/fields/:id/toggle'
   */
  async toggleField(req, res) {
    const { id } = req.params; //field id

    // type is either 'is_required' or 'is_enabled', value = true/false
    const { type, value } = req.body;
    try {
      await company_visitor_field.update(
        { [type]: value },
        {
          where: { id }
        }
      );
      res.status(200).send({ message: 'changes saved' });
    } catch (err) {
      res.status(500).send('Error updating field, try again');
    }
  },


  /**
   * Delete a custom field
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route DELETE: '/api/v1/settings/fields/:id'
   */
  deleteCustomFields(req, res) {
    const { id } = req.params;
    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      company_visitor_field.findOne({
        where: {
          id,
          company: req.user.company
        }
      }).then(result => {
        if (result) {
          company_visitor_field.destroy({
            where: {id}
          })
            return res.status(200).send({ message: `Custom field deleted` });
        
        } else {
          return res.status(400).send('Custom field not found');
        }
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  /**
   * Add a custom options field
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route POST: '/api/v1/settings/option-fields/:visit_type'
   */
  async addCustomOptionFields(req, res) {
    const { name, is_required, is_enabled, options } = req.body;
    const { visit_type } = req.params;
    if (!name) {
      return res.status(400).send('field name is required');
    }
    if (!options.length) {
      return res.status(400).send('at least, one field option is required');
    }
    try {
      const field = await company_visitor_field.create({
        field_name: name,
        is_enabled,
        is_required,
        visit_type,
        field_type: 'select',
        company: req.user.company,
        location: req.user.location
      });
      for (let i = 0; i < options.length; i += 1) {
        await company_visitor_field_option.create({
          option_name: options[i],
          field: field.id,
          location: req.user.location
        });
      }
      const result = await company_visitor_field.findOne({
        where: {
          id: field.id
        },
        include: [
          {
            model: company_visitor_field_option,
            as: 'options'
          }
        ]
      });
      return res.status(200).send({ data: result, message: `Custom options field added` });
    } catch (err) {
      return res.status(500).send(`error adding field, try again`);
    }
  },


  /**
   * Add a select option to an options field
   * @param {obj} req req obj
   * @param {obj} res obj
   * @returns json obj
   * @route POST: '/api/v1/settings/option-fields/:id/options'
   */
  async addCustomOption(req, res) {
    const { id } = req.params;
    const { option } = req.body;
    if (!option) return res.status(400).send('Option name is required');
    try {
      const result = await company_visitor_field_option.create({
        option_name: option,
        field: id,
        location: req.user.location
      });
      return res.status(200).send({ data: result, message: `Custom option added` });
    } catch (err) {
      return res.status(500).send(`error adding option, try again`);
    }
  },


  /**
   * Deletes an options field option
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route DELETE: '/api/v1/settings/option-fields/:id/options'
   */
  async deleteOption(req, res) {
    const { id } = req.params;
    if (!id) return res.status(400).send('Option id is required');
    try {
      await company_visitor_field_option.destroy({
        where: {
          id
        }
      });
      return res.status(200).send({ message: `removed successfully` });
    } catch (err) {
      return res.status(500).send(`error deleting option, try again`);
    }
  },


  /**
   * Get visit types/purpose
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route GET: '/api/v1/settings/fields/:visit_type'
   */
  async getVisitTypeFields(req, res) {
    const { visit_type } = req.params;
    if (!visit_type) return res.status(400).send('visit type is required');
    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      try {
        const defaultFields = await company_visitor_field.findAll({
          where: {
            company: req.user.company,
            is_default: true,
            field_name: { [Op.not]: 'purpose' }
          }
        });
        const customFields = await company_visitor_field.findAll({
          where: {
            company: req.user.company,
            location: req.user.location,
            visit_type,
            is_default: false
          },
          include: [
            {
              model: company_visitor_field_option,
              as: 'options'
            }
          ]
        });
        return res.status(200).send({ data: [...defaultFields, ...customFields] });
      } catch (err) {
        console.log(err);
        res.status(500).send('internal server error');
      }
    }
    return res.status(401).send('Access denied');
  },


  /**
   * Add company locations
   * @param {obj} req req obj
   * @param {*} res res obj
   * @returns json obj
   * @route POST: '/api/v1/settings/add-location'
   */
  async addLocation(req, res) {
    const data = req.body;
    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      if (req.user.plan === 'Free') {
        const location = await visitorsuite_location.count({
          where: {
            company: req.user.company
          }
        });
        if (location >= 5) return res.status(400).send('Upgrade your plan to add more locations');
      }
      const doesKeyExist = key => {
        return Object.prototype.hasOwnProperty.call(data, key) || false;
      };
      if (doesKeyExist(`name`) && doesKeyExist(`address`)) {
        if (data.name.length > 2 && data.address.length > 3) {
          const location = await visitorsuite_location.create({
            id: null,
            name: data.name,
            address: data.address,
            company: req.user.company,
            date: Date.now(),
            is_active: 1
          });

          return res.status(200).send({ location, message: 'location added' });
        } else {
          return res.status(400).send('location details must be min of 3 characters');
        }
      } else {
        return res.status(400).send('location name and address is required');
      }
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  /**
   * Edit company location
   * @param {obj} req req obj
   * @param {*} res res obj
   * @returns json obj
   * @route POST: '/api/v1/settings/edit-location/:id'
   */
  editLocation(req, res) {
    const { id } = req.params;
    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      visitorsuite_location.findOne({
        where: {
          id,
          company: req.user.company
        }
      }).then(result => {
        const data = req.body;
        if (result) {
          const doesKeyExist = key => {
            return Object.prototype.hasOwnProperty.call(data, key) || false;
          };
          if (doesKeyExist(`name`) && doesKeyExist(`address`)) {
            if (data.name.length > 3 && data.address.length > 3) {
              visitorsuite_location.update(
                {
                  name: data.name,
                  address: data.address
                },
                { returning: true, where: { id: result.id } }
              ).then(() => {
                visitorsuite_location.findOne({
                  where: {
                    id,
                    company: req.user.company
                  }
                }).then(loc => {
                  return res.status(200).send({ data: loc, message: 'Changes saved!' });
                });
              });
            } else {
              return res.status(400).send('location details must be min of 3 characters');
            }
          } else {
            return res.status(200).send('location name and address is required');
          }
        } else {
          return res.status(400).send('Location not found');
        }
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  /**
   * Disable a location
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   */
  disableLocation(req, res) {
    const { id } = req.params;
    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      visitorsuite_location.findOne({
        where: {
          id,
          company: req.user.company,
          is_active: 1
        }
      }).then(result => {
        visitorsuite_location.update(
          {
            is_active: 0
          },
          { returning: true, where: { id: result.id } }
        ).then(() => {
          return res.status(200).send(`Location ${result.name} disabled`);
        });
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  /**
   * Enable company location
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   */
  enableLocation(req, res) {
    const { id } = req.params;
    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      visitorsuite_location.findOne({
        where: {
          id,
          company: req.user.company,
          is_active: 0
        }
      }).then(result => {
        visitorsuite_location.update(
          {
            is_active: 1
          },
          { returning: true, where: { id: result.id } }
        ).then(() => {
          return res.status(200).send(`Location ${result.name} enabled`);
        });
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  /**
   * Get all companies location
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route GET: '/api/v1/settings/view-location'
   */
  viewAllLocation(req, res) {
    console.log(req.user.company, "ppppppppssssss")
    try{

        if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        visitorsuite_location.findAll({
          where: {
            company: req.user.company
          }
        }).then(result => {
          return res.status(200).json({
            status: 'success',
            locations: result
          });
        });
      } else {
        
        return res.status(400).send('Access denied!');
      }
    }catch(err){
      console.log("ewiwiowewe", err)
    }

  },


  /**
   * Gets all companies Enabled locations
   * @param {obj} req req obj
   * @param {obj} res res obj
   */
  viewAllEnabledLocation(req, res) {
    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      visitorsuite_location.findAll({
        where: {
          company: req.user.company,
          is_active: 1
        }
      }).then(result => {
        return res.status(200).json({
          status: 'success',
          data: result
        });
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  /**
   * Get all companies disabled location
   * @param {obj} req
   * @param {obj} res
   * @returns json obj
   */
  viewAllDisabledLocation(req, res) {
    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      visitorsuite_location.findAll({
        where: {
          company: req.user.company,
          is_active: 0
        }
      }).then(result => {
        res.status(200).send({
          status: 'success',
          data: result
        });
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  addUser(req, res) {
    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      visitorsuite_company.findOne({
        where: {
          id: req.user.company
        }
      }).then(emp => {
        if (emp) {
          addUser(req, res);
        } else {
          return res.status(400).send('Company not found');
        }
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  /**
   *
   * @param {string} email reciepient email
   * @param {string} subject message subject
   * @param {string} message message body
   * @returns promise obj
   */
  async sendEmailMessage(email, subject, message) {
    console.log(email, 'opiytttttttttttttt')
    const formData = {
      from: 'hello@carrotsuite.space',
      to: `${email}`,
      subject,
      html: message
    };
    try{

      await request.post({url:'https://carrotsuite.com.ng/sesmailer.php', formData: formData}, function optionalCallback(err, httpResponse, body) {
      if (err) {
        console.log(err, "kssssssssssssssdddddddddd")
        return new Promise( (resolve, reject) => reject('message failed'));
      }
      console.log('message sent');
      return new Promise( (resolve, reject) => resolve(body));
    });

    }catch(err){
      console.log(err)
    }
    

    
  },


  /**
   * Send SMS message
   * @param {string} phone_number reciepient phone number
   * @param {string} text message body
   * @returns promise obj
   */
  async sendSMSMessage(phone_number, text) {
    console.log("ppppppppppppppppppppsssssssssssssssssssssssssssssssssssssssssssss")
    try{
       return new Promise((resolve, reject) => {
      console.log(phone_number);
      const textContent = {
        body: text,
        from: twilioNumber,
        to:  "+"+phone_number
      };
      client.messages
        .create(textContent)
        .then(message => console.log(message.sid, 'cannnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'))
        .catch(err => {
          console.log(err);
          resolve(err);
        });
    });
    }catch(err){
      console.log(err, "ooooooooooooooooorewe")
    }
   
  },


  /**
   * Get companies details
   * @param {obj} req req obj
   * @param {*} res res obj
   * @returns rjson obj
   * @route GET: '/api/v1/settings/get-company'
   */
  async getCompany(req, res) {
    let company = await visitorsuite_company.findOne({
      where: {
        id: req.user.company
      }
    });
    return res.status(200).send({ company });
  },


  /**
   * edit company name and logo
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/edit-company'
   */
  async editCompany(req, res) {
    if (!req.body.name) return res.status(400).send('Company name can not be blank');

    if (req.user.role == 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      try {
        if (req.file) {
          let datauri = dataUri(req.file).content;
          let img = await uploader.upload(datauri, { folder: 'visitorsuite' });

          await visitorsuite_company.update(
            {
              name: req.body.name,
              logo: img.url
            },
            { where: { id: req.user.company }, returning: true, plain: true }
          );
          const company = await visitorsuite_company.findOne({
            where: {
              id: req.user.company
            }
          });
          return res.status(200).send({ data: company, message: 'update saved' });
        } else {
          await visitorsuite_company.update(
            { name: req.body.name },
            {
              where: {
                id: req.user.company
              }
            }
          );
          const company = await visitorsuite_company.findOne({
            where: {
              id: req.user.company
            }
          });
          return res.status(200).send({ data: company, message: 'update saved' });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
      }
    } else {
      return res.status(400).send('Access denied!');
    }
  },


  /**
   * Edit company country info
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @route PUT: '/api/v1/settings/company-country'
   */
  async editCountry(req, res) {
    try {
      await visitorsuite_company.update(
        { country: req.body.country },
        {
          where: {
            id: req.user.company
          }
        }
      );
      const company = await visitorsuite_company.findOne({
        where: {
          id: req.user.company
        }
      });
      return res.status(200).send({ data: company, message: 'update saved' });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  /**
   * Get company configurations settings
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @route GET: '/api/v1/settings/configurations'
   */
  getConfigurations(req, res) {
    if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
      company_configurations.findOne({
        where: {
          company: req.user.company,
          location: req.user.location
        }
      })
        .then(configs => {
          if (configs) return res.status(200).send({ configs, message: 'Changes saved' });
          return res.status(200).send({ configs: {}, message: 'Changes saved' });
        })
        .catch(err => {
          return res.status(500).send(err.message);
        });
    } else {
      return res.status(401).send('Access Denied');
    }
  },


  /**
   *
   * edits companies configuration settings
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json res
   * @route PUT: '/api/v1/settings/edit-configurations'
   */
  editConfiguration(req, res) {
    const data = req.body;
    if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {

      // check if auto sign out all settings is off
      // and delete companiies auto sign out all cron job
      if (!data.auto_signout_all) {
        visitorsuite_jobs.destroy({
          where: {
            company: req.user.company,
            location: req.user.location
          }
        });
      }
      company_configurations.findOne({
        where: {
          company: req.user.company,
          location: req.user.location
        }
      })
        .then(configs => {
          if (configs) {
            company_configurations.update(
              {
                ...data,
                location: req.user.location
              },
              {
                returning: true,
                where: {
                  company: req.user.company,
                  location: req.user.location
                }
              }
            )
              .then(() => {
                settingsController.getConfigurations(req, res);
              })
              .catch(err => {
                return res.status(500).send(err.message);
              });
          } else {
            company_configurations.create({
              ...data,
              company: req.user.company,
              location: req.user.location
            })
              .then(() => {
                settingsController.getConfigurations(req, res);
              })
              .catch(err => {
                return res.status(500).send(err.message);
              });
          }
        })
        .catch(err => {
          return res.status(500).send(err.message);
        });
    } else {
      return res.status(401).send('Access Denied');
    }
  },


  /**
   *
   * Add companies staff
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json res
   * @route POST: '/api/v1/settings/add-staff'
   */
  // this should be in user controller
  async addStaff(req, res) {
    
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      try {
        
        const location = await visitorsuite_location.findOne({
          where:{
             id: req.user.location,
          company: req.user.company
          }
        });
        if (!location) return res.status(400).send('Set your company location');
        if (location.is_active === 0)
          return res.status(400).send('This company location has been disabled');

        let role = 'EMPLOYEE';
        let estate_house = null;
        const { errors, isValid } = validateAddStaff(req.body);
        // Check Validation
        if (!isValid) {
          return res.status(400).json(errors);
        }
        if (req.user.plan === 'Free') {
          const staffCount = await visitorsuite.count({
            where: {
              company: req.user.company
            }
          });
          if (staffCount >= 5)
            return res
              .status(401)
              .send(
                'You have reached the number of users allowed for this plan. upgrade your plan to add more users.'
              );
        }
        const password = shortid();
        const hashedPassword = bcrypt.hashSync(password, 8);
        const data = req.body;

        

        const {visitorsuite} = models;
        const visitorSuite = await visitorsuite.findOne({
          where: {
            email: data.email
          }
        });

        if (visitorSuite) return res.status(400).send({ message: 'account already exist' });
        const company = await UserControllerClone.getCompany(req, res);

        if (company.options === 'estate' && !req.user.estate_house) {
          role = 'CARE_TAKER';
          estate_house = data.house;
          if (!data.house) return res.status(400).send({ message: 'Select a house' });
        }
        if (company.options === 'estate' && req.user.estate_house) {
          role = 'TENANT';
          estate_house = req.user.estate_house;
        }

        
        const visitorSuite1 = await visitorsuite.create({
          id: null,
          company: req.user.company,
          workspace_company: req.user.workspace_company,
          estate_house,
          email: data.email,
          password: hashedPassword,
          first_name: data.first_name,
          last_name: data.last_name,
          appointment_only: data.appointment_only,
          role,
          date: Date.now(),
          country: req.user.country,
          is_active: 1,
          api_key: hashedPassword,
          position: data.staff_position,
          assistant: data.assistant,
          msg_option: 0,
          location: req.user.location
        });

        

        if (visitorSuite1) {
          const payload = {
            staff: visitorSuite1.id,
            company: visitorSuite1.company,
            workspace_company: visitorSuite1.workspace_company,
            estate_house: visitorSuite1.estate_house
          };

          let token1 = jwty.encode(payload, secretKey);
          const bitly = await settingsController.init(
            `${baseUrl}/api/v1/visitor/send-me-an-appointment/${token1}`
          );

          console.log('d2bitly', bitly);
          await visitorsuite.update({ link: bitly.url }, { where: { id: visitorSuite1.id} });

          await visitorsuite_phone.create({
            id: null,
            phone_number: data.phone_number,
            date: Date.now(),
            user: visitorSuite1.id,
            company: req.user.company
          });
          visitorsuitEvents.emit('sendLoginCred', visitorsuite, visitorsuite.email, password);

          const visitorsuiteObj = {
            id: visitorSuite1.id,
            first_name: visitorsuite.first_name,
            last_name: visitorsuite.last_name,
            email: visitorsuite.email,
            phone_number: data.phone_number,
            staff_position: visitorsuite.position
          };
          return res.status(201).json({
            status: 'success',
            message: 'Account created',
            data: visitorsuiteObj,
            auth: true
          });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send(err);
      }
    } else {
      return res.status(400).send('Unauthorized access');
    }
  },


  /**
   *
   * Add custom notification message for staff when visitors arrive
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/staff-notif'
   */
  async saveStaffNotif(req, res) {
    try {
      if (!req.body.message) res.status(400).send('Content is required!');
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        const notif = await staff_notif.findOne({
          where: { company: req.user.company, location: req.user.location }
        });
        if (notif) {
          await staff_notif.update(
            {
              content: req.body.message,
              location: req.user.location
            },
            {
              where: {
                company: req.user.company,
                location: req.user.location
              }
            }
          );
          return res.status(200).send('Notification saved!');
        } else {
          await staff_notif.create({
            id: null,
            company: req.user.company,
            content: req.body.message,
            location: req.user.location
          });
          return res.status(200).send('Notification saved!');
        }
      }
    } catch (err) {
      res.status(500).send(err);
    }
  },


  /**
   *
   * Get staff custom notification message
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route GET: '/api/v1/settings/staff-notif'
   */
  async getStaffNotif(req, res) {
    try {
      const notif = await staff_notif.findOne({
        where: {
          company: req.user.company,
          location: req.user.location
        }
      });
      if (notif) return res.status(200).send({ data: notif });
      return res.status(404).send('Not found');
    } catch (err) {
      res.status(500).send(err);
    }
  },


  /**
   *
   * Add custom welcome message visitors recieve on arrival
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/welcome-notif'
   */
  async saveWelcomeNotif(req, res) {
    try {
      if (!req.body.message) res.status(400).send('Content is required!');
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        const notif = await welcome_notif.findOne({
          where: { company: req.user.company, location: req.user.location }
        });
        if (notif) {
          await welcome_notif.update(
            {
              content: req.body.message,
              location: req.user.location
            },
            {
              where: {
                company: req.user.company,
                location: req.user.location
              }
            }
          );
          return res.status(200).send('Notification saved!');
        } else {
          await welcome_notif.create({
            id: null,
            company: req.user.company,
            content: req.body.message,
            location: req.user.location
          });
          return res.status(200).send('Notification saved!');
        }
      }
    } catch (err) {
      res.status(500).send(err);
    }
  },


  /**
   *
   *  Gets custome visitors welcome message
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route GET: '/api/v1/settings/welcome-notif'
   */
  async getWelcomeNotif(req, res) {
    try {
      const notif = await welcome_notif.findOne({
        where: {
          company: req.user.company,
          location: req.user.location
        }
      });
      if (notif) return res.status(200).send({ data: notif });
      return res.status(404).send('Not found');
    } catch (err) {
      res.status(500).send(err);
    }
  },


  /**
   *
   * Add and update custom message default host recieves for unscheduled visitors
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/default-notif'
   */
  async saveDefaultHostNotif(req, res) {
    try {
      if (!req.body.message) res.status(400).send('Content is required!');
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        const company = await UserControllerClone.getCompany(req, res);
        if (company.options === 'office') {
          const notif = await default_host_notif.findOne({
            where: {
              company: req.user.company,
              location: req.user.location
            }
          });
          if (notif) {
            await default_host_notif.update(
              {
                content: req.body.message,
                location: req.user.location
              },
              {
                where: {
                  company: req.user.company,
                  location: req.user.location
                }
              }
            );
            return res.status(200).send('Notification saved!');
          } else {
            await default_host_notif.create({
              id: null,
              company: req.user.company,
              content: req.body.message,
              location: req.user.location
            });
            return res.status(200).send('Notification saved!');
          }
        } else if (company.options === 'workspace') {
          const notif = await default_host_notif.findOne({
            where: { company: req.user.company, workspace_company: req.user.workspace_company }
          });
          if (notif) {
            await default_host_notif.update(
              {
                content: req.body.message,
                location: req.user.location
              },
              {
                where: {
                  company: req.user.company,
                  workspace_company: req.user.workspace_company,
                  location: req.user.location
                }
              }
            );
            return res.status(200).send('Notification saved!');
          } else {
            await default_host_notif.create({
              id: null,
              company: req.user.company,
              workspace_company: req.user.workspace_company,
              content: req.body.message,
              location: req.user.location
            });
            return res.status(200).send('Notification saved!');
          }
        } else if (company.options === 'estate') {
          const notif = await default_host_notif.findOne({
            where: { company: req.user.company, estate_house: req.user.estate_house }
          });
          if (notif) {
            await default_host_notif.update(
              {
                content: req.body.message
              },
              {
                where: {
                  company: req.user.company,
                  estate_house: req.user.estate_house,
                  location: req.user.location
                }
              }
            );
            return res.status(200).send('Notification saved!');
          } else {
            await default_host_notif.create({
              id: null,
              company: req.user.company,
              estate_house: req.user.estate_house,
              content: req.body.message,
              location: req.user.location
            });
            return res.status(200).send('Notification saved!');
          }
        } else return res.send(404).send('Other options are not available yet!');
      } else res.send(401).send('unauthorized acces!');
    } catch (err) {
      console.log("mskdjewwwwwwwww", err)
      res.status(500).send(err);
    }
  },


  /**
   *
   *  Gets default host custom notification message
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route POST: '/api/v1/settings/default-notif'
   */
  async getDefaultHostNotif(req, res) {
    try {
      const company = await UserControllerClone.getCompany(req, res);
      let notif = '';
      if (company.options === 'office') {
        notif = await default_host_notif.findOne({
          where: {
            company: req.user.company,
            location: req.user.location
          }
        });
      } else if (company.options === 'workspace') {
        notif = await default_host_notif.findOne({
          where: {
            company: req.user.company,
            workspace_company: req.user.workspace_company,
            location: req.user.location
          }
        });
      } else if (company.options === 'estate') {
        notif = await default_host_notif.findOne({
          where: { 
            company: req.user.company, 
            estate_house: req.user.estate_house,
            location: req.user.location
          }
        });
      }

      if (notif) return res.status(200).send({ data: notif });
      return res.status(404).send('Not found');
    } catch (err) {
      res.status(500).send(err);
    }
  },


  /**
   *
   * Saves time to auto sign out all visitors
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/signout-time'
   */
  async saveSignoutTime(req, res) {
    try {
      if (!req.body.time) res.status(400).send('sign out time is required!');
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        const time = await visitorsuite_jobs.findOne({
          where: { company: req.user.company }
        });
        if (time) {
          await visitorsuite_jobs.update(
            {
              run_at: req.body.time,
              location: req.user.location
            },
            {
              where: {
                company: req.user.company,
                location: req.user.location
              }
            }
          );
          return res.status(200).send('Sign out time saved!');
        } else {
          await visitorsuite_jobs.create({
            id: null,
            company: req.user.company,
            run_at: req.body.time,
            location: req.user.location
          });
          return res.status(200).send('Sign out time saved!');
        }
      }
    } catch (err) {
      res.status(500).send(err);
    }
  },


  /**
   * Get auto sign visitors out time
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route GET: '/api/v1/settings/signout-time'
   */
  async getSignOutTime(req, res) {
    try {
      const time = await visitorsuite_jobs.findOne({
        where: {
          company: req.user.company,
          location: req.user.location
        }
      });
      if (time) return res.status(200).send({ data: time });
      return res.status(404).send('Not found');
    } catch (err) {
      res.status(500).send(err);
    }
  },


  /**
   * Cron job to schedule auto sign out of visitors
   */
  async runAutoSignOut() {
    const jobs = await visitorsuite_jobs.findAll();
    if (jobs.length) {
      jobs.forEach(job => {
        let time = job.run_at;
        let [hour, min] = time.split(':');
        cron.schedule(`${Number(min)} ${Number(hour)} * * *`, () => {
          settingsController.signVisitorsOut(job.company, job.location);
        });
      });
    }
  },


  /**
   *
   * Runs scheduled auto sign out of all visitors
   * @param {number} company company id
   * @param {number} location company location id
   */
  async signVisitorsOut(company, location) {
    await visitors.update(
      { leaving_date: Date.now() },
      {
        where: {
          company,
          leaving_date: null,
          location
        }
      }
    );
    console.log('visitors signed out');
  },


  /**
   * Creates or updates the custom message visitors
   * recieve when they recieve an invite
   * @param {obj} req req obj
   * @param {object} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/invite-notif'
   */
  async saveInviteNotif(req, res) {
    try {
      if (!req.body.message) res.status(400).send('Content is required!');
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        const notif = await invite_notif.findOne({
          where: {
            company: req.user.company,
            location: req.user.location
          }
        });
        if (notif) {
          await invite_notif.update(
            {
              content: req.body.message,
              location: req.user.location
            },
            {
              where: {
                company: req.user.company,
                location: req.user.location
              }
            }
          );
          return res.status(200).send('Notification saved!');
        } else {
          await invite_notif.create({
            id: null,
            company: req.user.company,
            content: req.body.message,
            location: req.user.location
          });
          return res.status(200).send('Notification saved!');
        }
      }
    } catch (err) {
      res.status(500).send(err);
    }
  },


  /**
   *
   * Gets custom visitor invite notif
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route GET: '/api/v1/settings/invite-notif'
   */
  async getInviteNotif(req, res) {
    try {
      const notif = await invite_notif.findOne({
        where: {
          company: req.user.company,
          location: req.user.location
        }
      });
      if (notif) return res.status(200).send({ data: notif });
      return res.status(404).send('Not found');
    } catch (err) {
      res.status(500).send(err);
    }
  },


  /**
   * @description Save default host to be notified when
   * a visitor does not select a host
   * @param {obj} req req object
   * @param {object} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/default-host'
   */
  async saveDefaultHost(req, res) {
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        const host = req.body;
        let defaultHost = '';

        const company = await UserControllerClone.getCompany(req, res);
        if (company.options === 'office') {
          defaultHost = await default_host.create({
            company: req.user.company,
            location: req.user.location,
            staff_id: host.id,
            staff_name: `${host.first_name} ${host.last_name}`,
            email: host.email,
            avatar: host.avatar
          });
        } else if (company.options === 'workspace') {
          defaultHost = await default_host.create({
            company: req.user.company,
            location: req.user.location,
            workspace_company: req.user.workspace_company,
            staff_id: host.id,
            staff_name: host.name,
            email: host.email,
            avatar: host.avatar
          });
        } else if (company.options === 'estate') {
          defaultHost = await default_host.create({
            company: req.user.company,
            location: req.user.location,
            estate_house: req.user.estate_house,
            staff_id: host.id,
            staff_name: host.name,
            email: host.email,
            avatar: host.avatar
          });
        } else return res.status(400).send('Other options are not available yet');

        return res.status(200).send({ data: defaultHost });
      }
      return res.status(200).send('unAuthorized');
    } catch (err) {
      console.log("jfksssssss", err)
      res.status(500).send('Server error');
    }
  },


  /**
   * Get default host to be notified for unscheduled visitors
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj\
   * @route GET: '/api/v1/settings/default-host'
   */
  async getDefaultHost(req, res) {
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        let host = '';
        const company = await UserControllerClone.getCompany(req, res);
        if (company.options === 'office') {
          host = await default_host.findOne({
            where: {
              company: req.user.company,
              location: req.user.location
            }
          });
        } else if (company.options === 'workspace') {
          host = await default_host.findOne({
            where: {
              company: req.user.company,
              workspace_company: req.user.workspace_company,
              location: req.user.location
            }
          });
        } else if (company.options === 'estate') {
          host = await default_host.findOne({
            where: {
              company: req.user.company,
              estate_house: req.user.estate_house,
              location: req.user.location
            }
          });
        } else return res.status(404).send('Other options are not available yet');

        return res.status(200).send({ data: host });
      }
      return res.status(200).send('unAuthorized');
    } catch (err) {
      console.log(err);
      res.status(500).send('Server error');
    }
  },


  /**
   *
   * Delete default host
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route DELET: '/api/v1/settings/default-host/;id'
   */
  async removeDefaultHost(req, res) {
    const { id } = req.params;
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        await default_host.destroy({
          where: {
            id: id
          }
        });
        return res.status(200).send({ message: 'Default host removed' });
      }
      return res.status(200).send('unAuthorized');
    } catch (err) {
      res.status(500).send('Server error');
    }
  },


  /**
   * Saves a defult host that will be notified when visitors sign in ipad goes off
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route PUT: '/api/v1/settings/ipad-admin'
   */
  async saveIpadAdmin(req, res) {
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        const host = req.body;

        const admin = await ipad_admin.create({
          company: req.user.company,
          location: req.user.location,
          staff_id: host.id,
          staff_name: `${host.first_name} ${host.last_name}`,
          email: host.email,
          avatar: host.avatar
        });

        return res.status(200).send({ data: admin });
      }
      return res.status(200).send('unAuthorized Access');
    } catch (err) {
      console.log(err)
      res.status(500).send('Server error');
    }
  },


  /**
   *
   * @param {obj} req req obj
   * @param {obj} res res obj
   * json obj
   * * @route GET: '/api/v1/settings/ipad-admin'
   */
  async getIpadAdim(req, res) {
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        const admin = await ipad_admin.findOne({
          where: {
            company: req.user.company,
            location: req.user.location
          }
        });

        return res.status(200).send({ data: admin });
      }
      return res.status(200).send('unAuthorized Access');
    } catch (err) {
      console.log(err);
      res.status(500).send('Server error');
    }
  },


  /**
   *
   * Deletes an ipad admin
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route DELETE: '/api/v1/settings/ipad-admin/:id'
   */
  async removeIpadAdmin(req, res) {
    const { id } = req.params;
    try {
      if (req.user.role === 'GLOBAL_ADMIN' || req.user.role == 'LOCATION_ADMIN') {
        await ipad_admin.destroy({
          where: {
            id: id
          }
        });
        return res.status(200).send({ message: 'Admin removed' });
      }
      return res.status(200).send('unAuthorized');
    } catch (err) {
      res.status(500).send('Server error');
    }
  },


  /**
   * Uploads a welcome picture that will be shown
   * to visitors of given type after they finish signing up
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @route POST: '/api/v1/settings/welcome-images'
   */
  async uploadWelcomeGraphic(req, res) {
    if (!req.file) res.status(400).send('select a welcome graphic');
    try {
      const { visit_type } = req.body;
      let datauri = dataUri(req.file).content;
      let img = await uploader.upload(datauri, { folder: 'visitorsuite' });

      const graphic = await company_welcome_graphic.findOne({
        where: {
          company: req.user.company,
          visit_type,
          location: req.user.location
        }
      });
      if (graphic) {
        const public_id = graphic.graphic_id;
        await company_welcome_graphic.update(
          { graphic: img.url, graphic_id: img.public_id },
          {
            where: {
              company: req.user.company,
              visit_type,
              location: req.user.location
            }
          }
        );
        await uploader.destroy(public_id);
        return res
          .status(200)
          .send({ message: 'Graphic saved!', data: { ...graphic, graphic: img.url } });
      } else {
        const result = await company_welcome_graphic.create({
          graphic: img.url,
          graphic_id: img.public_id,
          company: req.user.company,
          visit_type,
          location: req.user.location
        });
        // if welcome image is for a visit type, not general welcome image,
        // check if company has visit type configurations
        if (visit_type) {
          const type = await visit_types_config.findOne({
            where: {
              company: req.user.company,
              visit_type,
              location: req.user.location
            }
          });
          if (type) {
            // update what will show on welcome screen to image
            await visit_types_config.update(
              {
                welcome_message: 'image',
                location: req.user.location
              },
              {
                where: {
                  company: req.user.company,
                  visit_type,
                  location: req.user.location
                }
              }
            );
          } else {
            // if company has no visit type configs
            // create the visit type configs
            await visit_types_config.create({
              company: req.user.company,
              visit_type,
              welcome_message: 'image',
              location: req.user.location
            });
          }
          res.status(201).send({ message: 'Graphic saved!', data: result });
        }
        res.status(201).send({ message: 'Graphic saved!', data: result });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  /**
   *
   * Get welcome image
   * @param {req} req req obj
   * @param {res} res res obj
   * @route GET: '/api/v1/settings/welcome-images/:visit_type'
   */
  async getWelcomeGraphic(req, res) {
    const { visit_type } = req.params;

    try {
      const graphic = await company_welcome_graphic.findOne({
        where: {
          company: req.user.company,
          visit_type,
          location: req.user.location
        }
      });
      return res.status(200).send({ data: graphic });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  /**
   *
   * Deletes welcome message
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route DELETE: '/api/v1/settings/welcome-images/:id'
   */
  async deleteWecomeGraphic(req, res) {
    const { id } = req.params;
    try {
      const graphic = await company_welcome_graphic.findOne({
        where: { company: req.user.company, id }
      });
      if (graphic) {
        await company_welcome_graphic.destroy({ where: { company: req.user.company, id } });
        await uploader.destroy(graphic.graphic_id);
        return res.status(200).send({ message: 'Graphic removed' });
      } else {
        return res.status(400).send('You have no uploaded graphic');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  /**
   *
   * Add a welcome message visitors will
   * recieve when they finish signing up
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route POST: '/api/v1/settings/welcome-message/:visit_type'
   */
  async addWelcomeMessage(req, res) {
    const { message } = req.body;
    const { visit_type } = req.params;
    if (req.user.role === 'GLOBAL_ADMIN' || req.user.role === 'LOCATION_ADMIN') {
      if (!message) return res.status(400).send('enter message');

      try {
        const type = await visitor_welcome_message.findOne({
          where: {
            company: req.user.company,
            visit_type,
            location: req.user.location
          }
        });
        if (type) {
          await visitor_welcome_message.update(
            {
              message,
              location: req.user.location
            },
            {
              where: {
                company: req.user.company,
                visit_type,
                location: req.user.location
              }
            }
          );
        } else {
          await visitor_welcome_message.create({
            message,
            visit_type,
            company: req.user.company,
            location: req.user.location
          });
        }
        const config = await visit_types_config.findOne({
          where: {
            company: req.user.company,
            visit_type,
            location: req.user.location
          }
        });
        // if company has configs for this visit type, 
        // change what will show on welcome screen  to TEXT
        if (config) {
          await visit_types_config.update(
            {
              welcome_message: 'text',
              location: req.user.location
            },
            {
              where: {
                company: req.user.company,
                visit_type,
                location: req.user.location
              }
            }
          );
        } else {
          // create configs
          await visit_types_config.create({
            company: req.user.company,
            visit_type,
            welcome_message: 'text',
            location: req.user.location
          });
        }
        return res.status(200).send({ message: 'save successfully' });
      } catch (err) {
        res.status(200).send('internal server error');
      }
    }
  },


  /**
   * Get visit type welcome message
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route GET: '/api/v1/settings/welcome-message/:visit_type'
   */
  async getVisitTypeWelcomeMessage(req, res) {
    const { visit_type } = req.params;
    try {
      const message = await visitor_welcome_message.findOne({
        where: {
          visit_type,
          company: req.user.company,
          location: req.user.location
        }
      });
      return res.status(200).send({ data: message });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  /**
   * Upload slider images for mobile app
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route POST: '/api/v1/settings/slide-images'
   */
  async uploadImageSlide(req, res) {
    if (!req.file) res.status(400).send('select an image');
    try {
      let datauri = dataUri(req.file).content;
      let img = await uploader.upload(datauri, { folder: 'visitorsuite' });

      await company_image_slide.create({
        url: img.url,
        public_id: img.public_id,
        company: req.user.company,
        location: req.user.location
      });
      res.status(201).send({ message: 'image saved!', data: img.url });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  /**
   *
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route DELETE: '/api/v1/settings/slide-images/:id'
   */
  async deleteSlideImage(req, res) {
    const { id } = req.params;
    try {
      const image = await company_image_slide.findOne({ where: { company: req.user.company, id } });
      if (image) {
        await company_image_slide.destroy({ where: { company: req.user.company, id } });
        await uploader.destroy(image.public_id);
        return res.status(200).send({ message: 'image removed' });
      } else {
        return res.status(400).send('You have no uploaded image');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  /**
   * Get slide imaages
   * @param {req} req req obj
   * @param {res} res res obj
   * @route GET: '/api/v1/settings/slide-images'
   */
  async getSlideImages(req, res) {
    try {
      const images = await company_image_slide.findAll({
        where: { company: req.user.company, location: req.user.location }
      });
      return res.status(200).send({ data: images });
    } catch (err) {
      res.send(500).send('internal server error');
    }
  },


  /**
   * Add a visit type
   * @param {obj} req req obj
   * @param {obj} res  res obj
   * @returns json obj
   * @route POST: '/api/v1/settings/visit-types'
   */
  async addVisitType(req, res) {
    try {
      const { visit_type, color } = req.body;
      if (!visit_type) return res.status(400).send('Enter a visit purpose');
      const exist = await company_visitor_field_option.findOne({
        where: {
          option_name: visit_type,
          location: req.user.location
        }
      })
      if(exist) return res.status(400).send(`${visit_type} already exist!`);

      const purposeField = await company_visitor_field.findOne({
        where: {
          company: req.user.company,
          field_name: 'purpose'
        }
      });
      const option = await company_visitor_field_option.create({
        option_name: visit_type,
        field: purposeField.id,
        color,
        location: req.user.location
      });
      
      return res.status(201).send({ data: option, message: 'Added successfully' });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  /**
   * Get confgs for a visit type
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   * @route GET '/api/v1/settings/visit-type-configs/:visit_type'
   */
  async getVisitTypeConfig(req, res) {
    const { visit_type } = req.params;
    try {
      const configs = await visit_types_config.findOne({
        where: {
          company: req.user.company,
          visit_type,
          location: req.user.location
        }
      });
      return res.status(200).send({ data: configs });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  /**
   * Saves a visit type config
   * @param {obj} req res obj
   * @param {*} res res obj
   * @returns json obj
   * @route POST '/api/v1/settings/visit-type-configs/:visit_type'
   */
  async saveVisitTypeConFig(req, res) {
    const { visit_type } = req.params;
    const data = req.body;
    try {
      const type = await visit_types_config.findOne({
        where: {
          company: req.user.company,
          visit_type,
          location: req.user.location
        }
      });
      if (type) {
        await visit_types_config.update(
          {
            ...data,
            location: req.user.location
          },
          {
            where: {
              company: req.user.company,
              visit_type,
              location: req.user.location
            }
          }
        );
        return res.status(200).send({ message: 'saved successfully' });
      } else {
        await visit_types_config.create({
          company: req.user.company,
          location: req.user.location,
          ...data
        });
        return res.status(200).send({ message: 'saved successfully' });
      }
    } catch (err) {
      res.status(500).send('internal server error');
    }
  }
};


module.exports = settingsController;
