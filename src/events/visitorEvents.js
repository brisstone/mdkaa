import { Console } from 'console';

const events = require('events');
const jwty = require('jwt-simple');
const models = require('../models');
const settingsController = require('../controllers/settingsController');
const UserController = require('../controllers/userController');



const {
  visitorsuite,
  visitorsuite_company,
  company_configurations,
  staff_notif,
  invite_notif,
  default_host,
  default_host_notif,
  visitorsuite_phone,
  welcome_notif,
  visitors,
  visitorsuite_location
} = models;

// console.log("pppppewwwwwwwwwwwwwwwwwwwwwwwrrrrrrrrrrrrrrrtttttt", models)



const secretKey = 'techcellent360globalsupersecretkey';
const visitorEvent = new events.EventEmitter();
const baseUrl = "http://dashboard.carrotsuite.space"

visitorEvent.on('notifyFrontDesk', notifyFrontDesk);
visitorEvent.on('notifySecurity', notifySecurityAdmin);
visitorEvent.on('notifyVisitor', notifyVisitor);
visitorEvent.on('sendWelcomeMessage', sendWelcomeMessage);
visitorEvent.on('staffNotification', staffNotifMessage);
visitorEvent.on('notifyDefaultHost', notifyDefaultHost);
visitorEvent.on('sendDeclineMsg', sendDeclineMsg);
visitorEvent.on('sendAssistantTransferMsg', sendAssistantTransferMsg);
visitorEvent.on('sendVisitorTransferMsg', sendVisitorTransferMsg);
visitorEvent.on('sendEbarge', sendEbargeLink);
visitorEvent.on('uploadAvatar', uploadVisitorAvatar);

/**
 * upload visitor picture to cloudinary
 * @param {obj} uploader cloudinary uploader obj
 * @param {string} datauri file data uri
 * @param {number} visitorId the visitor id
 */
async function uploadVisitorAvatar(uploader, datauri, visitorId){
  try {
    let img = await uploader.upload(datauri, { folder: 'visitorsuite' });
    await visitors.update({ avatar: img.url }, { where: { id: visitorId } });
  } catch (err) {
    console.log(err)
  }
}

async function notifySecurityAdmin(company, location, visitor){
  try {
    const security = await visitorsuite.findOne({
      where: {
        company,
        location,
        role: 'SECURITY_ADMIN'
      }
    })
    console.log(security, "ki88888888888888888888888")
    if(security){
      const message = `An authorized visitor with the name: ${visitor.name}, phone number: ${visitor.phone_number}. Is trying to checking at the reception`;
      const phone = await visitorsuite_phone.findOne({
        where: {
          user: security.id
        }
      })  
      if(phone){
        await settingsController.sendSMSMessage(phone.phone_number, message)
        console.log(phone.phone_number, 'messAGE SENT')
      } else {
        await settingsController.sendEmailMessage(security.email, 'Unauthorized visitor check in', message)
      }
    }
  } catch (err) {
    console.log(err, "eerorr")
  }
}
/**
 * Notify the front desk admin when ever a visitor is invited
 * @param {number} company comapany id
 * @param {object} data visitor data
 * @param {number} location company location id
 */
async function notifyFrontDesk(company, data, location) {
  try {
    const companyConfigs = await company_configurations.findOne({ where: { company, location } });

    // if settings is off, abort
    if (!companyConfigs.frontdesk_notif) return;
    const theCompany = await 	visitorsuite_company.findOne({
      where: {
        id: company
      }
    });
    const admin = await visitorsuite.findOne({
      where: {
        role: 'FRONT_DESK_ADMIN',
        company,
        location,
        staff: staff.id
      }
    });

    // default notification message
    const message = `${data.name} has been invited to ${theCompany.name} on ${new Date(
      data.day
    ).getDate()}-${new Date(data.day).getMonth() + 1}-${new Date(data.day).getFullYear()}. ${
      data.time
    } \n Visit type: ${data.purpose}`;

    await settingsController.sendEmailMessage(
      admin.email,
      `New invite at ${theCompany.name}`,
      message
    );
  } catch (err) {
    console.log(err);
  }
}
/**
 * send visitor invite message
 * @param {number} company_id company id
 * @param {object} data visitor data
 * @param {string} link
 * @param {number} location
 */
async function notifyVisitor(company_id, data, link, location) {
  let date = new Date(data.day);
  let theDate = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()} ${data.time}`;
  try {
    const company = await 	visitorsuite_company.findOne({ where: { id: company_id } });
    const companyLocation = await visitorsuite_location.findOne({
      where: {
        id: location
      }
    })

    // default invitation message
    const defaultMessage = `Hello ${data.name}, <br /> You have been invited to <b>${
      company.name
    } ${companyLocation.name}, ${companyLocation.address} </b> on <b>${theDate}</b>. Click the link below for more details. <br /> ${link}`;

    // get company custom invite messg
    const notif = await invite_notif.findOne({
      where: {
        company: company_id,
        location
      }
    });
    if (notif) {
      // replace keywords
      const content = notif.content;
      const replaced2 = await replaceVisitor(content, data.name);
      const replaced3 = await replaceCompany(replaced2, company.name);
      const replaced4 = await replaceDate(replaced3, theDate);

      let msg = replaced4.concat(` Click the link below for more details. \n ${link}`);

      //await settingsController.sendSMSMessage(data.phone_number, msg);
      await settingsController.sendEmailMessage(data.email, `Carrotsuite Space | Invitation to ${company.name}`, msg);
    } else {
      //await settingsController.sendSMSMessage(data.phone_number, defaultMessage);
      await settingsController.sendEmailMessage(
        data.email,
        `Carrotsuite Space | Invitation to ${company.name}`,
        defaultMessage
      );
    }
  } catch (err) {
    console.log(err);
  }
}
/**
 * send visitor welcome message
 * @param {object} visitorFields visitor fields
 * @param {object} visitor visitor details
 */
async function sendWelcomeMessage(visitorFields, visitor) {
  try {
    const companyConfigs = await company_configurations.findOne({
      where: { company: visitor.company, location: visitor.location }
    });
    // check if welcome message notif is enable
    if (!companyConfigs && !companyConfigs.visitor_notif) return;
    const company = await 	visitorsuite_company.findOne({ where: { id: visitor.company } });
    // default welcome message
    let defaultMessage = `Hello ${visitorFields.name}, welcome to ${
      company.name
    }. have a pleasant visit.`;

    // get company welcome messg
    const notif = await welcome_notif.findOne({
      where: {
        company: visitor.company,
        location: visitor.location
      }
    });
    if (notif) {
      // replace keywords
      const content = notif.content;
      const replaced1 = await replaceVisitor(content, visitorFields.name);
      const replaced2 = await replaceCompany(replaced1, company.name);

      visitorFields.phone_number &&
        (await settingsController.sendSMSMessage(visitorFields.phone_number, replaced2));
      visitorFields.email &&
        (await settingsController.sendEmailMessage(
          visitorFields.email,
          `${company.name}`,
          replaced2
        ));
    } else {
      visitorFields.phone_number &&
        (await settingsController.sendSMSMessage(visitorFields.phone_number, defaultMessage));
      visitorFields.email &&
        (await settingsController.sendEmailMessage(
          visitorFields.email,
          `${company.name}`,
          defaultMessage
        ));
    }
  } catch (err) {
    console.log(err);
  }
}
/**
 *
 * @param {object} staff staff data
 * @param {string} name visitor name
 * @param {string} private_note visitor private note
 * @param {string} purpose visit purpose
 * @param {string} link link
 */
async function staffNotifMessage(staff, name, private_note, purpose, link) {
  try {
    const companyConfigs = await company_configurations.findOne({
      where: { company: staff.company, location: staff.location }
    });
    const comp = await 	visitorsuite_company.findOne({
      where: {id: staff.company}
    })
    if (!companyConfigs && !companyConfigs.host_notif) return;

    let defaultMessage = `Hello ${
      staff.first_name
    }, ${name} is here to see you for the purpose of ${purpose}. \n Visit the link below to send a quick response \n ${link}`;
    let defaultEmailMessage = `Hello ${
      staff.first_name
    }, <br /> ${name} from ${comp.name} is here to see you for the purpose of ${purpose}. <br /> Visit the link below to send a quick response <br /> ${link}`;
    if (private_note) {
      defaultMessage = defaultMessage.concat(` \n Visitors private note: \n ${private_note}`);
      defaultEmailMessage = defaultEmailMessage.concat(` <br /> <b>Visitors private note</b> <br /> ${private_note}`);
    }
    const notif = await staff_notif.findOne({
      where: {
        company: staff.company,
        location: staff.location
      }
    });
    if (notif) {
      const content = notif.content;
      const replaced1 = await replaceStaff(content, staff.first_name);
      const replaced2 = await replaceVisitor(replaced1, name);
      const replaced3 = await replacePurpose(replaced2, purpose);

      let theMessage = '';

      if (private_note) {
        theMessage = replaced3.concat(
          ` \n Visitors private note \n ${private_note} \n visit the link below to send a quick response. \n ${link}`
        );
      } else {
        theMessage = replaced3.concat(
          ` \n visit the link below to send a quick response. \n ${link}`
        );
      }
      // check who should recieve notification message
      switch (staff.notif_option) {
        // staff only
        case 0:
          {
            await sendMsg(staff, theMessage, theMessage);
          }
          break;
        // assistant and assistant
        case 1:
          {
            if (staff.assistant) {
              const assistant = await visitorsuite.findOne({ where: { id: staff.assistant } });
              await sendMsg(assistant, theMessage, theMessage);
            }
          }
          break;
        case 2:
          {
            // staff and assistant 
            await sendMsg(staff, theMessage, theMessage);
            if (staff.assistant) {
              const assistant = await visitorsuite.findOne({ where: { id: staff.assistant } });
              await sendMsg(assistant, theMessage, theMessage);
            }
          }
          break;
        default:
          await sendMsg(staff, theMessage, theMessage);
      }
    } else {
      // who should recieve notification
      switch (staff.notif_option) {
        // staff only
        case 0:
          {
            await sendMsg(staff, defaultMessage, defaultEmailMessage);
          }
          break;
        // assistant only
        case 1:
          {
            if (staff.assistant) {
              const assistant = await visitorsuite.findOne({ where: { id: staff.assistant } });
              await sendMsg(assistant, defaultMessage, defaultEmailMessage);
            }
          }
          break;
        // staff and assistant only
        case 2:
          {
            await sendMsg(staff, defaultMessage);
            if (staff.assistant) {
              const assistant = await visitorsuite.findOne({ where: { id: staff.assistant } });
              await sendMsg(assistant, defaultMessage, defaultEmailMessage);
            }
          }
          break;
        default:
          await sendMsg(staff, defaultMessage, defaultEmailMessage);
      }
    }
  } catch (err) {
    console.log(err);
  }
}
/**
 * Send notification message
 * @param {object} staff staff data
 * @param {string} theMessage message body
 * @param {string} defaultEmailMessage email template message body
 */
async function sendMsg(staff, theMessage, defaultEmailMessage) {
  if (staff.msg_option == 1) {
    const phone = await visitorsuite_phone.findOne({
      where: { user: staff.id }
    });
    await settingsController.sendSMSMessage(phone.phone_number, theMessage);
  } else {
    await settingsController.sendEmailMessage(staff.email, 'Carrotsuite Space | New Visitor', defaultEmailMessage);
  }
}
/**
 *
 * @param {number} company company id
 * @param {string} name visitor name
 * @param {string} private_note visitor private note
 * @param {string} purpose visit purpose
 * @param {string} token link
 * @param {number} workspace_company workspace company id
 * @param {number} estate_house estate house id
 * @param {number} location company location id
 */
async function notifyDefaultHost(
  company,
  name,
  private_note,
  purpose,
  token,
  workspace_company = null,
  estate_house = null,
  location
) {
  try {
    if (workspace_company) {
      const defaultHost = await default_host.findOne({
        where: {
          company,
          workspace_company,
          location
        }
      });
      if (defaultHost) {
        let defaultMsg = `Hello ${
          defaultHost.staff_name
        }, there is currently a visitor ${name}, on an 
      unscheduled visit. Could you please attend to them.`;
        if (private_note) {
          defaultMsg = defaultMsg.concat(` \n Visitors private note: \n ${private_note}`);
        }
        const defaultHostMsg = await 	default_host_notif.findOne({
          where: {
            company,
            workspace_company,
            location
          }
        });
        if (defaultHostMsg) {
          const content = defaultHostMsg.content;
          const replaced1 = await replaceStaff(content, defaultHost.staff_name);
          const replaced2 = await replaceVisitor(replaced1, name);
          //const replaced3 = await replacePurpose(replaced2, purpose);
          let theMessage;
          if (private_note) {
            theMessage = replaced2.concat(` \n Visitors private note: \n ${private_note}.`);
          } else {
            theMessage = replaced2;
          }
          if (defaultHost.msg_option === 1) {
            const phone = await visitorsuite_phone.findOne({
              where: { user: defaultHost.id }
            });
            await settingsController.sendSMSMessage(phone.phone_number, theMessage);
          } else
            await settingsController.sendEmailMessage(
              defaultHost.email,
              `Unscheduled Guest`,
              theMessage.concat(` \n Visit the link below to take action. \n ${token}`)
            );
        } else if (defaultHost.msg_option === 1) {
          const phone = await visitorsuite_phone.findOne({
            where: { user: defaultHost.id }
          });
          await settingsController.sendSMSMessage(
            phone.phone_number,
            defaultMsg.concat(` \n Visit the link below to take action. \n ${token}`)
          );
        } else
          await settingsController.sendEmailMessage(
            defaultHost.email,
            `Unscheduled Guest`,
            defaultMsg.concat(` \n Visit the link below to take action. \n ${token}`)
          );
      }
    } else if (estate_house) {
      const defaultHost = await default_host.findOne({
        where: {
          company,
          estate_house,
          location
        }
      });
      if (defaultHost) {
        let defaultMsg = `Hello ${
          defaultHost.staff_name
        }, there is currently a visitor ${name}, on an 
        unscheduled visit. Could you please attend to them.`;
        if (private_note) {
          defaultMsg = defaultMsg.concat(` \n Visitors private note: \n ${private_note}`);
        }
        const defaultHostMsg = await 	default_host_notif.findOne({
          where: {
            company,
            estate_house,
            location
          }
        });
        if (defaultHostMsg) {
          const content = defaultHostMsg.content;
          const replaced1 = await replaceStaff(content, defaultHost.staff_name);
          const replaced2 = await replaceVisitor(replaced1, name);
          //const replaced3 = await replacePurpose(replaced2, purpose);
          let theMessage;
          if (private_note) {
            theMessage = replaced2.concat(` \n Visitors private note: \n ${private_note}.`);
          } else {
            theMessage = replaced2;
          }
          if (defaultHost.msg_option === 1) {
            const phone = await visitorsuite_phone.findOne({
              where: { user: defaultHost.id }
            });
            await settingsController.sendSMSMessage(phone.phone_number, theMessage);
          } else
            await settingsController.sendEmailMessage(
              defaultHost.email,
              `Unscheduled Guest`,
              theMessage.concat(` \n Visit the link below to take action. \n ${token}`)
            );
        } else if (defaultHost.msg_option === 1) {
          const phone = await visitorsuite_phone.findOne({
            where: { user: defaultHost.id }
          });
          await settingsController.sendSMSMessage(
            phone.phone_number,
            defaultMsg.concat(` \n Visit the link below to take action. \n ${token}`)
          );
        } else
          await settingsController.sendEmailMessage(
            defaultHost.email,
            `Unscheduled Guest`,
            defaultMsg.concat(` \n Visit the link below to take action. \n ${token}`)
          );
      }
    } else {
      const defaultHost = await default_host.findOne({
        where: {
          company,
          location
        }
      });
      if (defaultHost) {
        let defaultMsg = `Hello ${
          defaultHost.staff_name
        }, there is currently a visitor ${name}, on an 
    unscheduled visit. Could you please attend to them.`;
        if (private_note) {
          defaultMsg = defaultMsg.concat(` \n Visitors private note: \n ${private_note}`);
        }
        const defaultHostMsg = await 	default_host_notif.findOne({
          where: {
            company,
            location
          }
        });
        if (defaultHostMsg) {
          const content = defaultHostMsg.content;
          const replaced1 = await replaceStaff(content, defaultHost.staff_name);
          const replaced2 = await replaceVisitor(replaced1, name);
          //const replaced3 = await replacePurpose(replaced2, purpose);
          let theMessage;
          if (private_note) {
            theMessage = replaced2.concat(` \n Visitors private note: \n ${private_note}.`);
          } else {
            theMessage = replaced2;
          }
          if (defaultHost.msg_option === 1) {
            const phone = await visitorsuite_phone.findOne({
              where: { user: defaultHost.id }
            });
            await settingsController.sendSMSMessage(phone.phone_number, theMessage);
          } else
            await settingsController.sendEmailMessage(
              defaultHost.email,
              `Unscheduled Guest`,
              theMessage.concat(` \n Visit the link below to take action. \n ${token}`)
            );
        } else if (defaultHost.msg_option === 1) {
          const phone = await visitorsuite_phone.findOne({
            where: { user: defaultHost.id }
          });
          await settingsController.sendSMSMessage(
            phone.phone_number,
            theMessage.concat(` \n Visit the link below to take action. \n ${token}`)
          );
        } else
          await settingsController.sendEmailMessage(
            defaultHost.email,
            `Unscheduled Guest`,
            defaultMsg.concat(` \n Visit the link below to take action. \n ${token}`)
          );
      }
    }
  } catch (errr) {
    console.log(err);
  }
}
/**
 * decline visitor visit
 * @param {object} visitorFields visitor data
 * @param {string} reason deline reason
 */
async function sendDeclineMsg(visitorFields, reason) {
  const visitorNameField = visitorFields.find(field => field.field_name === 'name');
  const visitorPhoneField = visitorFields.find(field => field.field_name === 'phone_number');

  const msg = `Hello ${
    visitorNameField.field_value
  }, I am currently unavailable to attend to you at the moment. kindly reschedule. \n ${reason}`;
  await settingsController.sendSMSMessage(visitorPhoneField.field_value, msg);
}
/**
 * Notify visit of host transfer
 * @param {object} visitorFields visitor data
 * @param {object} assistant assistant data
 */
async function sendVisitorTransferMsg(visitorFields, assistant) {
  const visitorNameField = visitorFields.find(field => field.field_name === 'name');
  const visitorPhoneField = visitorFields.find(field => field.field_name === 'phone_number');

  const msg = `Hello ${
    visitorNameField.field_value
  }, Your host is currently unavailable to attend to you at the moment. Your visit has been transfered to ${
    assistant.first_name
  } ${assistant.last_name}.`;
  await settingsController.sendSMSMessage(visitorPhoneField.field_value, msg);
}
/**
 * Notify assistant of visit transfer
 * @param {object} visitor visitor data
 * @param {object} host host data
 * @param {object} assistant assistant data
 * @param {string} link url
 */
async function sendAssistantTransferMsg(visitor, host, assistant, link) {
  const visitorNameField = visitor.fields.find(field => field.field_name === 'name');
  const visitorPurposeField = visitor.fields.find(field => field.field_name === 'purpose');
  try {
    let defaultMessage = `Hello ${assistant.first_name}, a visitor has been transfered to you by ${
      host.first_name
    } ${host.last_name}. \n Visitor name: ${visitorNameField.field_value} \n Visiting Purpose: ${
      visitorPurposeField.field_value
    }. \n Visit the link below to send a quick response \n ${link}`;

    if (assistant.msg_option == 1) {
      const phone = await visitorsuite_phone.findOne({
        where: { user: assistant.id }
      });
      await settingsController.sendSMSMessage(phone.phone_number, defaultMessage);
    } else {
      await settingsController.sendEmailMessage(
        assistant.email,
        'You have a Visitor',
        defaultMessage
      );
    }
  } catch (err) {
    console.log(err);
  }
}
/**
 * replace every occurrance of [HostName] with staff name
 * @param {string} message message to replace
 * @param {string} staff staff name
 */
async function replaceStaff(message, staff) {
  return message.replace(/\[HostName]/gi, staff);
}
/**
 * replace every occurrance of [VisitorName] with visitor name
 * @param {string} message message to replace
 * @param {string} visitorName visitor name
 */
async function replaceVisitor(message, visitorName) {
  return message.replace(/\[VisitorName]/gi, visitorName);
}
/**
 * replace every occurrance of [Purpose] with visit purpose
 * @param {string} message message to replace
 * @param {string} purpose visit purpose
 */
async function replacePurpose(message, purpose) {
  return message.replace(/\[Purpose]/gi, purpose);
}
/**
 * replace every occurrance of [CompanyName] with company name
 * @param {string} message message to replace
 * @param {string} company company name
 */
async function replaceCompany(message, company) {
  return message.replace(/\[CompanyName]/gi, company);
}
/**
 * replace every occurrance of [Date] with date
 * @param {string} message message to replace
 * @param {string} date date
 */
async function replaceDate(message, date) {
  return message.replace(/\[Date]/gi, date);
}
async function replaceCode(message, code) {
  return message.replace(/\[Code]/gi, code);
}
/**
 * send e-barg link to visitor
 * @param {array} visitorData visitor fields
 * @param {object} visitor visitor data
 */
async function sendEbargeLink(visitorData, visitor ) {
  const payload = {
    staff_id: visitor.staff,
    id: visitor.id,
    short_id: visitor.short_id,
    company: visitor.company
  };
  let token = jwty.encode(payload, secretKey);
  token = `${baseUrl}/api/v1/visitor/e-barge/${token}`;
  const { url } = await settingsController.init(token);
  const company = await 	visitorsuite_company.findOne({ where: { id: visitor.company } });
  let message = `Click the link below to view your ${company.name} visitor e-barg \n ${url}`;

  const phoneField = visitorData.find(field => field.field_name === 'phone_number');
  if (phoneField) {
    await settingsController.sendSMSMessage(phoneField.field_value, message);
  }
}


export default visitorEvent;