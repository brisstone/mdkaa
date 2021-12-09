const events = require('events');
const models = require('../models');
const settingsController = require('../controllers/settingsController');


const {
  company_configurations,
  visitorsuite_company,
  company_visitor_field,
  company_visitor_field_option,
  visitorsuite_location,
  visitorsuite
} = models;

const visitorsuitEvents = new events.EventEmitter();

visitorsuitEvents.on('createDefaultConfigs', createDefaultConfigs);
visitorsuitEvents.on('sendAdminInvite', sendAdminInvite);
visitorsuitEvents.on('createDefaultFields', createDefaultFields);
visitorsuitEvents.on('sendLoginCred', sendLoginCredentials);


/**
 * Create default configurations settings for company
 * @param {number} company company id
 * @param {*} location company location id
 */
async function createDefaultConfigs(company, location) {
  await company_configurations.create({
    company,
    location,
    host_notif: true,
    vistor_notif: true
  });
}


/**
 *
 * @param {object} admin admin data
 * @param {object} staff staff data
 * @param {string} role invited role
 * @param {string} link url
 * @param {number} location company location id
 */
async function sendAdminInvite(admin, staff, role, link, location) {
  try {
    const company = await visitorsuite_company.findOne({
      where: { id: staff.company }
    });
    const locationDetails = await visitorsuite_location.findOne({
      where: {
        id: location
      }
    });
    const msg = `Hello ${staff.first_name} ${staff.last_name}, <br /> ${admin.first_name} ${
      admin.last_name
    }(${admin.email}) has invited you to take up a role at ${company.name} ${
      locationDetails ? locationDetails.name : ''
    }, as a ${role}. <br /> Carrotsuite Space will digitize visitor sign-in and host notification at ${
      company.name
    }. <br /> Click on the link below to accept this role. \n ${link}`;

    console.log(settingsController, 'kkkli')
    
    await settingsController.sendEmailMessage(
      staff.email,
      'Carrotsuite Space admin role invite',
      msg
    );
  } catch (err) {
    console.log(err);
  }
}


/**
 * send staff login credentials
 * @param {object} staff staff details
 * @param {string} email staff email address
 * @param {string} password password
 */
async function sendLoginCredentials(staff, email, password) {
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


/**
 * create default visitor fields for company
 * @param {number} company company id
 */
async function createDefaultFields(company, location) {
  try {
    await company_visitor_field.create({
      field_name: 'name',
      field_position: 1,
      company,
      is_default: true
    });
    await company_visitor_field.create({
      field_name: 'email',
      field_position: 2,
      company,
      is_default: true
    });
    await company_visitor_field.create({
      field_name: 'phone_number',
      field_position: 3,
      company,
      is_default: true
    });

    const purpose = await company_visitor_field.create({
      field_name: 'purpose',
      field_position: 4,
      is_default: true,
      field_type: 'select',
      company
    });
    await company_visitor_field_option.create({
      option_name: 'Interview',
      field: purpose.id,
      color: '#6a82fb',
      location
    });
    await company_visitor_field_option.create({
      option_name: 'Appointment',
      field: purpose.id,
      color: '#fc5c7d',
      location
    });
    await company_visitor_field_option.create({
      option_name: 'Client',
      field: purpose.id,
      color: '#45b649',
      location
    });
    await company_visitor_field_option.create({
      option_name: 'Visit',
      field: purpose.id,
      color: '#f85032',
      location
    });
  } catch (err) {
    console.log(err);
  }
}


export default visitorsuitEvents;