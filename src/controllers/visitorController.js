const formidable = require('formidable');
const fs = require('fs');
const shortid = require('shortid');
const moment = require('moment');
const randomstring = require('randomstring');
const jwty = require('jwt-simple');
const sequelize = require('sequelize');
const models = require('../models');
import * as csv from 'fast-csv';
const path = require('path');
const { parse } = require('json2csv');
const uploader = require('../config/cloudinary-config');
const { dataUri } = require('../config/multer-config');

// Load Input Validation
const validateOfficeVisitor = require('../validation/office-visitor');
const validateSetAppoint = require('../validation/set-appoint');
const validateSetAppointDate = require('../validation/appoint-date');
const isEmpty = require('../validation/is-empty');
const validateOfficeGroupSchedules = require('../validation/group-register');
const settingsController = require('./settingsController');
const visitorEvents = require('../events/visitorEvents');
// const visitorEvent = require('../events/visitorEvents');
const UserControllerClone = require('./userControllerClone');

// console.log(UserControllerClone, 'ddddddddddssssssssssssdddddd')

// Load models
// console.log("na meeeeeeeeeeeeeeeeeee",models)

const {
  visitorsuite_appointment,
  visitorsuite_group_schedules,
  visitors
,
  visitorsuite_default_field,
  //CompanyCustomField,
  //CustomVisitingPurposes,
  visitorsuite,
  visitorsuite_company,
  company_configurations,
  company_visitor_field,
  company_visitor_field_option,
  visitor_field,
  default_host,
  workspace_company,
  visit_types_config,
  VisitorWelcomeMessage,
  CompanyWelcomeGraphic,
  visitorsuite_phone,
  visitorsuite_location,
  estate_house,
  visitor_blacklist,
  contact_directory,
} = models;

// console.log(visitorEvents, "oooooooooooooooppppppppppoooooos")


const Op = sequelize.Op;
const secretKey = 'techcellent360globalsupersecretkey';
const baseUrl = 'http://dashboard.carrotsuite.space';


const VisitorController = {
  
  /**
   * Gets default and custom companies visitor form fields
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   */
  async getFormfields(req, res) {

  
    try {
      
      const { visit_type } = req.params;
      
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
          visit_type,
          is_default: false,
          location: req.user.location
        },
        include: [
          {
            model: company_visitor_field_option,
            as: 'options'
          }
        ]
      });
      const fields = [...defaultFields, ...customFields];
      // check if to equire about visitor car and items
      let visitor_car = false,
        visitor_items = false;

      const visitTypeConfig = await visit_types_config.findOne({
        where: {
          company: req.user.company,
          location: req.user.location,
          visit_type: visit_type
        }
      });
      if (visitTypeConfig) {
        visitor_car = visitTypeConfig.visitor_car;
        visitor_items = visitTypeConfig.visitor_items;
      }
      return res.status(200).send({
        data: fields,
        isNewVisitor: true,
        visitor_items,
        visitor_car
      });
    } catch (err) {
      console.log("lowwwwwwwww",err)
      return res.status(500).send('Intrenal server error');
    }
  },
  /**
   * Get visiting purpose field and options
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/purpose-field’
   */
  async getPurposeField(req, res) {
    // console.log("kooooooooooooooooooooooooooooooooooooooooooooooooo",purpose)
    try {
      const purpose = await company_visitor_field.findOne({
        where: {
          field_name: 'purpose',
          field_type: 'select',
          company: req.user.company
        },
        include: [
          {
            model: company_visitor_field_option,
            as: 'options'
          }
        ]
      });
     
      res.status(200).send({ data: purpose });
    } catch (err) {
      console.log("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",err)
      res.status(500).send('internal server error');
    }
  },
  /**
   * Send alert message to all visitors in companies building premises
   * during emergencies
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route POST: ‘/api/v1/visitor/emergencies’
   */
  async alertVisitorsInEmergencies(req, res) {
    try {
      /**
       * get visitor email addres from visitor fields
       * @param {array} fields visitor fields
       * @returns email
       */
      const getEmail = fields => {
        const emailField = fields.find(field => field.field_name === 'email');
        return emailField.field_value;
      };
      const today = new Date();
      const visitors = await visitors.findAll({
        where: sequelize.and(
          sequelize.where(
            sequelize.fn('DATE', sequelize.col('visiting_date')),
            '=',
            `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
          ),
          { company: req.user.company },
          { location: req.user.location },
          { leaving_date: null }
        ),
        include: [
          {
            model: visitor_field,
            as: 'fields',
            attributes: ['id', 'field_name', 'field_value']
          }
        ]
      });

      for (let i = 0; i < visitors.length; i += 1) {
        const visitor = visitors[i];
        const message = req.body.message;
        const email = getEmail(visitor.fields);
        // send email
        await settingsController.sendEmailMessage(email, "Emergency", message);
      }
      return res.status(200).send({ message: 'message sent' });
    } catch (err) {
      console.log("kijshsasaaaaaaaaa",err);
      res.status(500).send;
    }
  },
  /**
   * Get visitor stats for visit type, schedule vs unschedule
   * and new vs returning
   *
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/stats’
   */
  async getVisitorsStats(req, res) {
    try {
      const data = {
        purposeVisitors: {},
        scheduleOrNot: {},
        newOrReturning: {}
      };
      // get visitors by purpose
      const purposeField = await company_visitor_field.findOne({
        where: {
          field_name: 'purpose',
          field_type: 'select',
          company: req.user.company
        },
        include: [
          {
            model: company_visitor_field_option,
            as: 'options'
          }
        ]
      });
      
      const visitorTypes = purposeField.options;

      const visitingPurposeData = [];
      const visitingPurposeLabel = [];
      const visitingPurposeColor = [];
      for (let i = 0; i < visitorTypes.length; i += 1) {
        const numOfVisitors = await visitor_field.count({
          where: {
            company: req.user.company,
            location: req.user.location,
            field_value: visitorTypes[i].option_name
          }
        });
        console.log(numOfVisitors, "kkkkkkkksdwwwwwwwwwwww")
        visitingPurposeData.push(numOfVisitors);
        visitingPurposeLabel.push(visitorTypes[i].option_name);
        visitingPurposeColor.push(visitorTypes[i].color)
      }

      // get visitors by schedule or not
      const totalVisitors = await visitors.count({
        where: {
          company: req.user.company,
          location: req.user.location,
          visiting_date: { [Op.not]: null }
        }
      });

     
      // attended ivites are the scheduled visitors
      const attendedInvites = await visitorsuite_appointment.count({
        where: {
          company: req.user.company,
          attended: 1,
          location: req.user.location
        }
      });

      
      // uncheduled visitors = the total visitors minus attended invites
      let unInvitedVisitors = totalVisitors - attendedInvites;
      unInvitedVisitors = unInvitedVisitors < 0 ? 0 : unInvitedVisitors;

      data.purposeVisitors.data = visitingPurposeData;
      data.purposeVisitors.label = visitingPurposeLabel;
      data.purposeVisitors.colors = visitingPurposeColor;
      data.scheduleOrNot.label = ['Scheduled', 'UnScheduled'];
      data.scheduleOrNot.data = [attendedInvites, unInvitedVisitors];

      const newOrReturning = await VisitorController.newReturningVisitors(req, res);

      console.log(newOrReturning, "===============================------------")
      data.newOrReturning.label = ['New Visitors', 'Returning Visitors'];
      data.newOrReturning.data = [newOrReturning.newVisitors, newOrReturning.returningVisitors];
      res.status(200).send({
        data
      });
    } catch (err) {
      console.log("ooooooookoooooo",err);
      res.status(500).send('internal server error');
    }
  },
  /**
   * Gets visitors monthly stats
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/monthly-stats’
   */
  async getVisitorsByMonth(req, res) {
    const currentDate = new Date();
    try {
      let MONTHS = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sept',
        'Oct',
        'Nov',
        'Dec'
      ];
      const month = currentDate.getMonth() + 1;
      // slice month to only show a month ahead month
      MONTHS = MONTHS.slice(0, month + 1);

      const uninvitedVisitors = [];
      const invitedVisitors = [];


      for (let i = 0; i < MONTHS.length-1; i++) {
        let uninvitedCount = await visitors.count({
          where: {
            company: req.user.company,
            location: req.user.location, 
            visiting_date: {
              [Op.gte]: new Date(`${currentDate.getFullYear()}-${i + 1}-01`),
              [Op.lt]: new Date(`${currentDate.getFullYear()}-${i + 2}-01`)
            }
          }
        });
        let invitedCount = await visitorsuite_appointment.count({
          where: {
            company: req.user.company,
            location: req.user.location,
            attended: 1,
            day_of_appoint: {
              [Op.gte]: new Date(`${currentDate.getFullYear()}-${i + 1}-01`),
              [Op.lt]: new Date(`${currentDate.getFullYear()}-${i + 2}-01`)
            }
          }


        });
        // console.log(new Date(`${currentDate.getFullYear()}-${i + 2}-01`), '0iiiiiidsdsddewqe3')
        // console.log(new Date(`${currentDate.getFullYear()}-${i + 1}-01`), 'dslaiwlwiwkwdds')

        let unInvited = uninvitedCount - invitedCount;
        unInvited = unInvited < 0 ? 0 : unInvited;
        uninvitedVisitors.push(unInvited);
        invitedVisitors.push(invitedCount);
      }
      res.status(200).send({
        data: {
          label: MONTHS,
          invitedVisitors,
          uninvitedVisitors
        }
      });
    } catch (err) {
      console.log(" getVisitorsByMonth..............",err);
      res.status(500).send('internal server error');
    }
  },
  /**
   * Gets visitors last month weekly stats
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/last-month-stats’
   */
  async lastMonthWeeklyStats(req, res) {
    try {
      let currentDate = new Date();
      const WEEKS = ['1st Week', '2nd Week', '3rd Week', '4th Week', '5th Week'];

      const uninvitedVisitors = [];
      const invitedVisitors = [];
      let dateFrom = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth()}-01`);
      let dateTo = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth()}-07`);

      // loop by 7 days
      for (let i = 7; i <= 31; i += 7) {
        let date = `${i + 7}`;
        if (i > 7) {
          // if the day is >=27 change end date to 30 to avoid invalid date error
          if (i >= 27) date = 30;
          dateFrom = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth()}-${i}`);
          dateTo = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth()}-${date}`);
        }

        let uninvitedCount = await visitors.count({
          where: {
            visiting_date: {
              [Op.gte]: dateFrom,
              [Op.lt]: dateTo
            },
            company: req.user.company,
            location: req.user.location
          }
        });
        let invitedCount = await visitorsuite_appointment.count({
          where: {
            attended: 1,
            day_of_appoint: {
              [Op.gte]: dateFrom,
              [Op.lt]: dateTo
            },
            company: req.user.company,
            location: req.user.location
          }
        });
        let unInvited = uninvitedCount - invitedCount;
        unInvited = unInvited < 0 ? 0 : unInvited;
        uninvitedVisitors.push(unInvited);
        invitedVisitors.push(invitedCount);
      }
      res.status(200).send({
        data: {
          label: WEEKS,
          invitedVisitors,
          uninvitedVisitors
        }
      });
    } catch (err) {
      console.log("kkkkkkkkkkkk" ,err);
      res.status(500).send('internal server error');
    }
  },
  /**
   * Gets visitors stats for today, yesterday,
   * today exits, visitors in premises, and expected visitors
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/general-stats’
   */
  async generalStats(req, res) {
    let d = new Date();
    let yesterday = new Date(d);
    yesterday.setDate(yesterday.getDate()-1);
    // yo= yesterdayUpdt.toDateString();
    yesterday.toDateString();
    
    const formatDate = () => {
      let month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      
      return [year, month, day].join('-');
    };
    try {
      const getTodaysVisitors = () =>
        visitors.count({
          where: sequelize.and(
            sequelize.where(
              sequelize.fn('DATE', sequelize.col('visiting_date')),
              '=',
              formatDate()
            ),
            { company: req.user.company },
            { location: req.user.location }
          )
        });
      const getYesterdaysVisitors = () =>
        visitors.count({
          where: sequelize.and(
            sequelize.where(
              sequelize.fn('DATE', sequelize.col('visiting_date')),
              '=',
              "2021-12-02",
              console.log("daaaaaatttttttttttttttttttttt,i should have prevday here", yesterday)
             
            ),
            { company: req.user.company },
            { location: req.user.location }
          )
        });
      const getSignedInVisitors = () =>
        visitors.count({
          where: sequelize.and(
            sequelize.where(
              sequelize.fn('DATE', sequelize.col('visiting_date')),
              '=',
              formatDate()
            ),
            {
              company: req.user.company
            },
            { location: req.user.location },
            { leaving_date: null }
          )
        });
      const getSignedOutVisitors = () =>
      visitors.count({
          where: sequelize.and(
            sequelize.where(sequelize.fn('DATE', sequelize.col('leaving_date')), '=', formatDate()),
            {
              company: req.user.company,
              location: req.user.location
            }
          )
        });
      const getTodaysInvites = () =>
        visitorsuite_appointment.count({
          where: sequelize.and(
            sequelize.where(
              sequelize.fn('DATE', sequelize.col('day_of_appoint')),
              '=',
              formatDate()
            ),
            {
              company: req.user.company,
              location: req.user.location,
              attended: 0
            }
          )
        });
      const [
        todaysVisitors,
        yesterdayVisitors,
        signedInVisitors,
        signedOutVisitors,
        todayInvites
      ] = await Promise.all([
        getTodaysVisitors(),
        getYesterdaysVisitors(),
        getSignedInVisitors(),
        getSignedOutVisitors(),
        getTodaysInvites()
      ]);

      const data = {
        todaysVisitors,
        yesterdayVisitors,
        signedInVisitors,
        signedOutVisitors,
        todayInvites
      };

      res.status(200).send({ data });
    } catch (err) {
      console.log("nayaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", err);
      res.status(500).send('internal server error');
    }
  },
  /**
   * Gets stats of most visited staff, company and estate
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/most-visited’
   */
  async mostVisited(req, res) {
    try {
      const company = await UserControllerClone.getCompany(req, res);

      if (company.options === 'office') {
        let data = [];

        const hosts = await visitorsuite.findAll({
          where: {
            company: req.user.company,
            location: req.user.location
          },
          attributes: ['id', 'first_name', 'last_name', 'avatar'],
          include: [
            {
              model: visitors,
              as: 'visitors',
              attributes: ['id']
            }
          ]
        });
        const visitors = await visitors.count({
          where: {
            company: req.user.company,
            location: req.user.location
          }
        });
        for (let i = 0; i < hosts.length; i += 1) {
          let host = hosts[i];
          let hostData = {
            name: `${host.first_name} ${host.last_name}`,
            avatar: host.avatar,
            visitors: host.visitors.length,
            percent: Math.ceil((host.visitors.length / visitors) * 100)
          };
          data.push(hostData);
        }
        const hasVisitors = data.filter(host => host.visitors > 0);
        if (!hasVisitors.length) return res.status(200).send({ data: [] });

        const sorted = hasVisitors.sort((a, b) => {
          if (a.visitors > b.visitors) return 1;
          if (a.visitors < b.visitors) return -1;

          return 0;
        });
        data = sorted.slice(0, 6);
        return res.status(200).send({ data });
      } else if (company.options === 'workspace') {
        VisitorController.mostVisitedCompany(req, res);
      } else if (company.options === 'estate') {
        VisitorController.mostVisitedHouse(req, res);
      } else return res.status(404).send('option not available');
    } catch (err) {
      console.log("most vvvvvvisitedd",err);
      res.status(500).send('internal server error');
    }
  },
  // Get stats for most visited workspace company
  async mostVisitedCompany(req, res) {
    try {
      let data = [];
      const companies = await workspace_company.findAll({
        where: {
          workspace: req.user.company,
          location: req.user.location
        },
        include: [
          {
            model: visitors,
            as: 'companyVisitors'
          }
        ]
      });
      const visitors1 = await visitors.count({
        where: {
          company: req.user.company,
          location: req.user.location
        }
      });
      for (let i = 0; i < companies.length; i += 1) {
        let company = companies[i];
        let companyData = {
          name: company.name,
          avatar: null,
          visitors: company.companyVisitors.length,
          percent: Math.ceil((company.companyVisitors.length / visitors1) * 100)
        };
        data.push(companyData);
      }
      const hasVisitors = data.filter(company => company.visitors > 0);
      if (!hasVisitors.length) return res.status(200).send({ data: [] });

      const sorted = hasVisitors.sort((a, b) => {
        if (a.visitors > b.visitors) return 1;
        if (a.visitors < b.visitors) return -1;

        return 0;
      });
      data = sorted.slice(0, 6);
      return res.status(200).send({ data });
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  // Get stats for most visited estate housee
  async mostVisitedHouse(req, res) {
    try {
      let data = [];
      const houses = await estate_house.findAll({
        where: {
          estate: req.user.company,
          location: req.user.location
        },
        include: [
          {
            model: visitors,
            as: 'houseVisitors'
          }
        ]
      });
      const visitors1 = await visitors.count({
        where: {
          company: req.user.company,
          location: req.user.location
        }
      });
      for (let i = 0; i < houses.length; i += 1) {
        let house = houses[i];
        let houseData = {
          name: house.block_no,
          avatar: null,
          visitors: house.houseVisitors.length,
          percent: Math.ceil((house.houseVisitors.length / visitors1) * 100)
        };
        data.push(houseData);
      }
      const hasVisitors = data.filter(house => house.visitors > 0);
      if (hasVisitors.length === 0) return res.status(200).send({ data: [] });

      const sorted = hasVisitors.sort((a, b) => {
        if (a.visitors > b.visitors) return 1;
        if (a.visitors < b.visitors) return -1;

        return 0;
      });
      data = sorted.slice(0, 6);
      return res.status(200).send({ data });
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  /**
   * Get busiest stats for; busiest week last year, busiest day last week
   * busiest month last year, busiest month last quarter
   *
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/busiest-stats’
   */
  async getBusiestData(req, res) {
    try {
      const {
        busiestWeekLastMonth,
        busiestDayLastWeek,
        busiestMonthLastYear,
        busiestMonthLastQuarter
      } = VisitorController;
      const [
        busiestDay,
        busiestWeek,
        busiestQuarterMonth,
        busiestLastYearMonth
      ] = await Promise.all([
        busiestDayLastWeek(req, res),
        busiestWeekLastMonth(req, res),
        busiestMonthLastQuarter(req, res),
        busiestMonthLastYear(req, res)
      ]);
      const data = [busiestDay, busiestWeek, busiestQuarterMonth, busiestLastYearMonth];

      res.status(200).send({
        data
      });
    } catch (err) {
      console.log("iiiiiiiiiiiiiiiiiiiiiiiiiiiii",err);
      res.status(500).send('internal server error');
    }
  },

  /**
   * Get busiest week last month
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   */
  async busiestWeekLastMonth(req, res) {
    try {
      let currentDate = new Date();
      const WEEKS = ['1st Week', '2nd Week', '3rd Week', '4th Week', '5th Week'];

      const data = [];
      let dateFrom = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth()}-01`);
      let dateTo = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth()}-07`);
      let count = 0;

      for (let i = 7; i <= 31; i += 7) {
        let date = `${i + 7}`;
        if (i > 7) {
          // set the date to 30 to avoid invalid date
          if (i >= 27) date = 30;
          dateFrom = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth()}-${i}`);
          dateTo = new Date(`${currentDate.getFullYear()}-${currentDate.getMonth()}-${date}`);
        }

        let visitors1 = await visitors.count({
          where: {
            visiting_date: {
              [Op.gte]: dateFrom,
              [Op.lt]: dateTo
            },
            company: req.user.company,
            location: req.user.location
          }
        });

        data.push({
          title: 'Busiest week last month',
          visitors1,
          data: WEEKS[count]
        });
        count += 1;
      }
      let max = data[0].visitors1;
      let index = 0;
      for (let i = 0; i < data.length; i += 1) {
        let datum = data[i];

        if (datum.visitors1 > max) {
          max = datum.visitors1;
          index = i;
        }
      }
      let theData = data[index];
      if (theData.visitors1 === 0) return { title: theData.title, data: null, visitors1: 0 };
      return data[index];
    } catch (err) {
      console.log(err);
    }
  },
  /**
   * Get busiest day last 7 days
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns  object
   */
  async busiestDayLastWeek(req, res) {
    try {
      let now = new Date(); //.setHours(00, 00, 00);

      //Change it so that it is 7 days in the past.
      var pastDate = now.getDate() - 7;
      now.setDate(pastDate);

      let DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      let MONTHS = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sept',
        'Oct',
        'Nov',
        'Dec'
      ];
      const data = [];

      for (let i = 0; i < 7; i += 1) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);

        const NewVisitors = await visitors.count({
          where: {
            company: req.user.company,
            location: req.user.location,
            visiting_date: {
              [Op.gte]: new Date(now.getFullYear(), now.getMonth(), now.getDate() + i),
              [Op.lt]: new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1)
            }
          }
        });
        data.push({
          title: 'Busiest day last 7 days',
          NewVisitors,
          data: `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`
        });
      }
      let max = data[0].NewVisitors;
      let index = 0;
      for (let i = 0; i < data.length; i += 1) {
        let datum = data[i];

        if (datum.NewVisitors > max) {
          max = datum.NewVisitors;
          index = i;
        }
      }
      let theData = data[index];
      if (theData.NewVisitors === 0) return { title: theData.title, data: 'nil', NewVisitors: 0 };
      return data[index];
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },
  /**
   * Get busiest month last year
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns object
   */
  async busiestMonthLastYear(req, res) {
    try {
      const currentDate = new Date();
      const date = new Date(`${currentDate.getFullYear()}-01-01`);

      let MONTHS = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sept',
        'Oct',
        'Nov',
        'Dec'
      ];

      const data = [];

      for (let i = 0; i < MONTHS.length; i++) {
        let toDate = new Date(`${date.getFullYear() - 1}-${i + 2}-01`);
        if (i === 11) toDate = new Date(`${date.getFullYear() - 1}-${i + 1}-31`);
        let visitors1 = await visitors.count({
          where: {
            company: req.user.company,
            location: req.user.location,
            visiting_date: {
              [Op.gte]: new Date(`${date.getFullYear() - 1}-${i + 1}-01`),
              [Op.lt]: toDate
            }
          }
        });
        data.push({
          title: 'Busiest month last year',
          data: MONTHS[i],
          visitors1
        });
      }
      let max = data[0].visitors1;
      let index = 0;
      for (let i = 0; i < data.length; i += 1) {
        let datum = data[i];

        if (datum.visitors1 > max) {
          max = datum.visitors1;
          index = i;
        }
      }
      let theData = data[index];
      if (theData.visitors1 === 0) return { title: theData.title, data: 'nil', visitors1: 0 };
      return data[index];
    } catch (err) {
      throw err;
    }
  },
  /**
   * Get busiest month last quarter
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns object
   */
  async busiestMonthLastQuarter(req, res) {
    try {
      const today = new Date();
      const quarter = Math.floor(today.getMonth() / 3);
      const data = [];

      for (let i = 3; i > 0; i--) {
        let visitors = await models.visitors.count({
          where: {
            company: req.user.company,
            location: req.user.location,
            visiting_date: {
              [Op.gte]: new Date(today.getFullYear(), quarter * 3 - i, 1),
              [Op.lt]: new Date(today.getFullYear(), quarter * 3 - i + 1, 1)
            }
          }
        });
        let month = '';
        if ((i = 3)) month = '1st month';
        if ((i = 2)) month = '2nd month';
        if ((i = 1)) month = '3rd month';
        data.push({
          title: 'Busiest month last Quarter',
          data: month,
          visitors
        });
      }
      let max = data[0].visitors;
      let index = 0;
      for (let i = 0; i < data.length; i += 1) {
        let datum = data[i];
        if (datum.visitors > max) {
          max = datum.visitors;
          index = i;
        }
      }
      let theData = data[index];
      if (theData.visitors === 0) return { title: theData.title, data: 'nil', visitors: 0 };
      return data[index];
    } catch (err) {
      throw err;
    }
  },
  /**
   * Get visitors stat of new vs returning visitors
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns object
   */
  async newReturningVisitors(req, res) {
    try {
      const visitors1 = await visitors.findAll({
        where: {
          company: req.user.company,
          location: req.user.location
        }
      });
      console.log("jjjjjjjjjjjjjjjjjjj", visitors1)
      const phoneFields = [];
      for (let i = 0; i < visitors1.length; i += 1) {
        //alert this visitor declared beneath clashes with the visitor from the model--okoli 
        let visitor = visitors1[i];

        // get the phone number field
        const phoneField = await visitor_field.findOne({
          where: {
            visitor: visitor.id,
            field_name: 'phone_number',
            company: req.user.company,
            location: req.user.location
          }
        });
        phoneFields.push(phoneField);
      }

      console.log(phoneFields, "''''''''@@@@@@@@@@@@@@@@@")

      const phoneNumbers = phoneFields.map(field => field.field_value);

      const totalLength = phoneNumbers.length;
      let returningVisitors = [];
      let uniqueNumbers = Array.from(new Set(phoneNumbers));

      let count = 0;
      for (let i = 0; i < uniqueNumbers.length; i += 1) {
        for (let j = 0; j < totalLength; j += 1) {
          if (phoneNumbers[j] == uniqueNumbers[i]) {
            count += 1;
          }
        }
        if (count > 1) returningVisitors.push(count);
        count = 0;
      }
      let data = {
        newVisitors: totalLength - returningVisitors.length,
        returningVisitors: returningVisitors.length
      };
      return data;
    } catch (err) {
      console.log("ooooooot6yroooooooo", err)
      throw err;
    }
  },
  /**
   * Get a single staff or host
   * @param {number} id staff id
   * @returns staff objectf
   */
  visitorSuiteMessageOption(id) {
    return new Promise((resolve, reject) => {
      visitorsuite.findOne({
        where: {
          id
        }
      }).then(result => {
        resolve(result);
      });
    });
  },
  /**
   * Check if visitor is new or returning
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns form fields of pre-populated visitors data or empty fields
   * @Route GET: ‘/api/v1/visitor/check-if-new-visitor/phone_number/visit_type’
   */
  async checkNewVisitor(req, res) {
    console.log("fffffffffffffff", req.params)
    const { phone_number, visit_type } = req.params;
    try {

      //check if visitor is blacklisted
      const isBlacklisted = await 	visitor_blacklist.findOne({
        where: {
          phone_number,
          company: req.user.company,
          location: req.user.location
        }
      })
      if(isBlacklisted){
        // message security admin
        visitorEvents.default.emit('notifySecurity', req.user.company, req.user.location, isBlacklisted);

        return res.status(401).send('You are not authorized to check in here!!! ')
      }
      // get all default fields
      const defaultFields = await company_visitor_field.findAll({
        where: {
          company: req.user.company,
          is_default: true,
          field_name: { [Op.not]: 'purpose' }
        }
      });
      // get custom fields
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
      
      const fields = [...defaultFields, ...customFields];
      // check if visitor phone number already exist
      const visitor = await visitor_field.findOne({
        where: {
          field_value: phone_number,
          company: req.user.company,
          location: req.user.location
        }
      });

      console.log('kkkkkkkkkkkkkkkksssssssssss', visitor)
      if (visitor) {
        const theVisitor = await visitors.findOne({ where: { id: visitor.visitor } });
        // if the visitor is still signed in, bounce visitor
        if (theVisitor.leaving_date == null) {
          return res.status(400).send('You are already signed in!');
        }
        const visitorFields = await visitor_field.findAll({
          where: {
            visitor: visitor.visitor
          }
        });
       
        // populate the form fields with the returning visitors data
        const formData = fields.map(field => {
          let theVisitorField = visitorFields.find(
            vField => vField.field_name.toLowerCase() === field.field_name.toLowerCase()
          );
          if (theVisitorField) {
            field.field_value = theVisitorField.field_value;
            return field;
          }
          return field;
        });
        // check if visitor is imported customer data
        const isImported = theVisitor.visiting_date ? false : true;

        // check if to equire about visitor car and items
        let visitor_car = false,
          visitor_items = false;

        const visitTypeConfig = await visit_types_config.findOne({
          where: {
            company: req.user.company,
            location: req.user.location,
            visit_type: visit_type
          }
        });
        if (visitTypeConfig) {
          visitor_car = visitTypeConfig.visitor_car;
          visitor_items = visitTypeConfig.visitor_items;
        }
        return res.status(200).send({
          data: formData,
          avatar: theVisitor.avatar,
          isImported,
          isNewVisitor: false,
          visitor_car,
          visitor_items
        });
      } else {
        // not new visitor, get form fields
        VisitorController.getFormfields(req, res);
      }
    } catch (err) {
      console.log("yyyyyyyyyyyyoooooooooooooootttttt",err);
      res.status(500).send('internal server error');
    }
  },
  /**
   * Host decline visitor visit
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route PUT: ‘/api/v1/visitor/:id/decline’
   */
  async declineVisitor(req, res) {
    const { id } = req.params;
    const { reason, token } = req.body;
    try {
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
        const visitor = await visitors.findOne({
          where: {
            id,
            leaving_date: null
          },
          include: [
            {
              model: visitor_field,
              as: 'fields',
              attributes: ['id', 'field_name', 'field_value']
            }
          ]
        });
        if (visitor) {
          visitorEvents.default.emit('sendDeclineMsg', visitor.fields, reason);
          await visitors.update({ leaving_date: Date.now() }, { where: { id } });

          return res.status(200).send({ message: 'Visit has been declined' });
        } else {
          res.status(400).send('Visitor already declined');
        }
      }
      return res.status(400).send('Invalid credentials');
    } catch (err) {
      return res.status(500).send('Internal server error');
    }
  },
  /**
   * Host transfer vistor to assistant
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route PUT: ‘/api/v1/visitor/:id/transfer/:assistantId’
   */
  async transferVisitor(req, res) {
    try {
      const { id, assistantId } = req.params;
      const { token, staff } = req.body;

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
        const visitor = await visitors.findOne({
          where: {
            id,
            staff,
            leaving_date: null
          },
          include: [
            {
              model: visitor_field,
              as: 'fields',
              attributes: ['id', 'field_name', 'field_value']
            }
          ]
        });
        if (visitor) {
          visitors.update(
            {
              staff: assistantId
            },
            {
              where: {
                id
              }
            }
          );
          const host = await visitorsuite.findOne({
            where: {
              id: staff
            }
          });
          const assistant = await visitorsuite.findOne({
            where: {
              id: assistantId
            }
          });
          const payload = {
            staff_id: assistantId,
            id: visitor.id,
            short_id: visitor.short_id,
            company: visitor.company
          };
          let token = jwty.encode(payload, secretKey);
          token = `${baseUrl}/api/v1/visitor/action/${token}`;
          const { url } = await settingsController.init(token);
          // notify visitor of transfer
          visitorEvents.default.emit('sendVisitorTransferMsg', visitor.fields, assistant);
          // notify assistant of transfer
          visitorEvents.default.emit('sendAssistantTransferMsg', visitor, host, assistant, url);

          res.status(200).send({ message: 'Visitor transfered to your assistant' });
        } else {
          res.status(404).send('Visitor declined or already transfered');
        }
      } else {
        res.status(400).send('Invalid credentails');
      }
    } catch (err) {
      res.status(500).send('Internal server error');
    }
  },
  /**
   * Host response to office visitor
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   */
  async sendOfficeCurrentVisitorAction(req, res, payload) {
    console.log('cal');
    const doesHaveKey = key => {
      return Object.prototype.hasOwnProperty.call(req.body, key) || false;
    };
    if (doesHaveKey(`action`)) {
      const data = req.body;
      const action = data.action;

      try {
        const visitor = await visitors.findOne({
          where: {
            id: payload.id,
            staff: payload.staff_id,
            short_id: payload.short_id,
            company: payload.company
          }
        });
        if (visitor) {
          const company = await 	visitorsuite_company.findOne({ where: { id: payload.company } });
          const staff = await VisitorController.visitorSuiteMessageOption(payload.staff_id);

          if (staff.msg_option === 0) {
            const visitorFields = await visitor_field.findAll({
              where: {
                visitor: visitor.id
              }
            });
            // send visitor e-pass link
            visitorEvents.default.emit('sendEbarge', visitorFields, visitor);
            const emailField = visitorFields.find(field => field.field_name === 'email');
            if (emailField) {
              await settingsController.sendEmailMessage(
                emailField.field_value,
                `${staff.first_name} ${staff.last_name} at ${company.name}`,
                action
              );
              await visitors.update(
                {
                  action
                },
                {
                  where: {
                    id: visitor.id
                  }
                }
              );
              return res.status(200).send({ message: 'Response delivered!' });
            } else {
              return res.status(400).send('Broken Link');
            }
          } else {
            const visitorFields = await visitor_field.findAll({
              where: {
                visitor: visitor.id
              }
            });
            // send visitor e-pass link
            visitorEvents.default.emit('sendEbarge', visitorFields, visitor);
            const phoneField = visitorFields.find(field => field.field_name === 'phone_number');
            if (phoneField) {
              const msg = `${action} \n -${staff.first_name} ${staff.last_name} at ${
                company.name
              } `;
              await settingsController.sendSMSMessage(phoneField.field_value, msg);
              await visitors.update(
                {
                  action
                },
                {
                  where: {
                    id: visitor.id
                  }
                }
              );
              return res.status(200).send({ message: 'Response delivered!' });
            } else {
              return res.status(400).send('Broken Link');
            }
          }
        } else {
          return res.status(400).send('Broken Link');
        }
      } catch (err) {
        console.log(err);
        res.status(500).send('internal server error');
      }
    } else {
      return res.status(400).send('A response is required');
    }
  },


  async blackListVisitors(req, res){
    if(
      req.user.role === 'GLOBAL_ADMIN' || 
      req.user.role === 'LOCATION_ADMIN' || 
      req.user.role === 'FRONT_DESK_ADMIN' || 
      req.user.role === 'CARE_TAKER'
      ){
        try{
          const {blacklist} = req.body;
          console.log(blacklist, 'iiiisssssssss')

          let count = 0;
          for(let i=0; i<blacklist.length; i+=1){
            const visitor = await visitors.findOne({
              where: {
                id: blacklist[i]
              },
              include: [
                {
                  model: visitor_field,
                  as: 'fields',
                  attributes: ['id', 'field_name', 'field_value']
                }
              ]
            })

            console.log(visitor, "kkdisssssssssss")
            if(visitor){
              const phoneField = visitor.fields.find(field => field.field_name === 'phone_number');
              const nameField = visitor.fields.find(field => field.field_name === 'name');
              const blacklisted = await visitor_blacklist.findOne({
                where: {
                  phone_number: phoneField.field_value
                }
              })
              if(!blacklisted){
                await 	visitor_blacklist.create({
                  company: visitor.company,
                  location: visitor.location,
                  phone_number: phoneField.field_value,
                  name: nameField.field_value,
                  visitor: visitor.id
                })
                count++;
              }
              
            }
          }
          return res.status(200).send({
            message: `${count} visitors has been blacklisted`
          })
        }catch(err){
          console.log(err);
          res.status(500).send('internal server error')
        }
      } else {
        return res.status(401).send('unauthorized');
      }
  },
  async getBlacklistedVisitors(req, res){
    if(
      req.user.role === 'GLOBAL_ADMIN' || 
      req.user.role === 'LOCATION_ADMIN' || 
      req.user.role === 'FRONT_DESK_ADMIN' || 
      req.user.role === 'CARE_TAKER'
      ){
        try{
          const list = await 	visitor_blacklist.findAll({
            where: {
              company: req.user.company,
              location: req.user.location
            },
            include: [
              {
                model: visitors,
                as: 'visitorInfo',
                attributes: ['id', 'avatar']
              }
            ]
          })
          return res.status(200).send({
            data: list
          })
        }catch(err){
          console.log(err)
          res.status(500).send('internal server err')
        }
      }
      else return res.status(401).send('unauthorized');
  },
  async removeBlacklistedVisitor(req, res){
    if(
      req.user.role === 'GLOBAL_ADMIN' || 
      req.user.role === 'LOCATION_ADMIN' || 
      req.user.role === 'FRONT_DESK_ADMIN' || 
      req.user.role === 'CARE_TAKER'
      ){
        try {
          const {id} = req.params;
          await 	visitor_blacklist.destroy({
            where: {
              id
            }
          })
          return res.status({
            message: 'Record removed'
          })
        } catch (err) {
          console.log(err)
          res.status(500).send('internal server err')
        }
      }
      else return res.status(401).send('unauthorized');
  },
  async sendMessage(req, res){
    try {
      const {list, subject, message} = req.body;
      if(!subject || !message) return res.status(400).send('Subject and message body is required')
      for(let i=0; i<list.length; i+=1){
        const visitor = await visitors.findOne({
          where: {
            id: Number(list[i])
          },
          include: [
            {
              model: visitor_field,
              as: 'fields',
              attributes: ['id', 'field_name', 'field_value']
            }
          ]
        })
        if(visitor){
          const emailField = visitor.fields.find(field => field.field_name === 'email');
         
          if(emailField)
          await settingsController.sendEmailMessage(emailField.field_value, subject, message)
        }
      }
      return res.status(200).send({message: 'Message has been sent'})
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error')
    }
  },
  /**
   * Host respond to visitor visit
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route POST: '/api/vi/visitor/action/set
   */
  sendCurrentVisitorAction(req, res) {
    console.log('cajajjaj');
    try {
      const { token } = req.body;
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
        if (payload.staff_id) {
          visitorsuite_company.findOne({
            where: {
              id: payload.company
            }
          }).then(rep => {
            if (rep) {
              VisitorController.sendOfficeCurrentVisitorAction(req, res, payload);
            } else {
              return res.status(404).send('company not recorgnised');
            }
          });
        } else {
          return res.status(404).send('Invalid credentials');
        }
      } else {
        return res.status(404).send('Invalid credentials');
      }
    } catch (err) {
      console.log(err);
      return res.status(404).send('Invalid credentials');
    }
  },
  /**
   * Host preview office visitor
   * @param {obj} req
   * @param {obj} res
   * @param {obj} payload
   * @param {string} token
   */
  showOfficeCurrentVisitor(req, res, payload, token) {
    visitors.findOne({
      where: {
        id: payload.id,
        staff: payload.staff_id,
        short_id: payload.short_id,
        company: payload.company
      }
    }).then(result => {
      if (result) {
        req.params.id = result.short_id;
        // redirect to vistor preview
        return res.redirect(`${baseUrl}/host-action?id=${result.id}&token=${token}`);
      } else {
        return res.redirect(`${baseUrl}/not-found`);
      }
    });
  },
  /**
   * Get host current visitor
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/action/:id’
   */
  showCurrentVisitor(req, res) {
    const { id } = req.params;
    try {
      const payload = jwty.decode(id, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };
      if (
        doesHaveKey(`staff_id`) &&
        doesHaveKey(`id`) &&
        doesHaveKey(`short_id`) &&
        doesHaveKey(`company`)
      ) {
        visitorsuite_company.findOne({
          where: {
            id: payload.company
          }
        }).then(rep => {
          if (rep) {
            VisitorController.showOfficeCurrentVisitor(req, res, payload, id);
          } else {
            return res.status(404).send('Error');
          }
        });
      } else {
        return res.status(404).send('Broken link');
      }
    } catch (err) {
      return res.status(400).send('Broken link');
    }
  },
  /**
   * Endpoint when visitor clicks on e-bardge.
   * redirect to vistor e-pass page
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/e-barge/:token’
   */
  async validateToken(req, res) {
    const { token } = req.params;
    try {
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
        const visitor = await visitors.findOne({
          where: {
            id: payload.id,
            staff: payload.staff_id,
            short_id: payload.short_id,
            company: payload.company
          }
        });
        if (visitor && visitor.leaving_date === null ) {
          return res.redirect(`${baseUrl}/visitor-e-barge?token=${token}`);
        } else {
          return res.status(400).send('e-barg has expired');
        }
      } else {
        return res.status(400).send('Invalid credentials');
      }
    } catch (err) {
      res.status.send(500).send('Internal server error');
    }
  },
  /**
   * Get visitor e-pass details
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/get-e-barge/token’
   */
  async getBargeDetails(req, res) {
    const { token } = req.params;
    try {
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
        const visitor = await visitors.findOne({
          where: {
            id: payload.id,
            staff: payload.staff_id,
            short_id: payload.short_id,
            company: payload.company
          },
          attributes: ['id', 'short_id', 'avatar', 'visiting_date'],
          include: [
            {
              model: visitor_field,
              as: 'fields',
              attributes: ['id', 'field_name', 'field_value']
            },
            {
              model: 	visitorsuite_company,
              as: 'companyInfo',
              attributes: ['id', 'name', 'logo', 'companyemail']
            },
            {
              model: visitorsuite,
              as: 'host',
              attributes: ['id', 'first_name', 'last_name']
            },
            {
              model: visitorsuite_location,
              as: 'locationInfo',
              attributes: ['id', 'name', 'address']
            }
          ]
        });
        if (visitor) {
          return res.status(200).send({ data: visitor });
        } else {
          return res.status(400).send('Invalid credentials');
        }
      } else {
        return res.status(400).send('Invalid credentials');
      }
    } catch (err) {
      console.log(err)
      res.status(500).send('Internal server error');
    }
  },
  /**
   * Gets visitor visiting history
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/:phone_number/history’
   */
  async getVisitorHisitory(req, res) {
    try {
      const { phone_number } = req.params;
      const history = [];

      const fields = await visitor_field.findAll({
        where: {
          field_value: phone_number,
          company: req.user.company,
          location: req.user.location
        }
      });

      if (fields.length) {
        for (let i = 0; i < fields.length; i += 1) {
          const visitor = await visitors.findOne({
            where: {
              id: fields[i].visitor
            },
            include: [
              {
                model: visitorsuite,
                as: 'host',
                attributes: ['id', 'first_name', 'last_name']
              },
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ]
          });
          const data = {};
          if (visitor.company === req.user.company && !visitor.workspace_company) {
            const purposeField = visitor.fields.find(field => field.field_name === 'purpose');
            const nameField = visitor.fields.find(field => field.field_name === 'name');

            data.name = nameField.field_value || '';
            data.purpose = purposeField.field_value || '';
            data.visiting_date = visitor.visiting_date;
            (data.leaving_date = visitor.leaving_date),
              (data.host = `${visitor.host.first_name} ${visitor.host.last_name}`);

            history.push(data);
          } else if (
            visitor.company === req.user.company &&
            visitor.workspace_company === req.user.workspace_company
          ) {
            const purposeField = visitor.fields.find(field => field.field_name === 'purpose');
            const nameField = visitor.fields.find(field => field.field_name === 'name');

            data.name = nameField.field_value || '';
            data.purpose = purposeField.field_value || '';
            data.visiting_date = visitor.visiting_date;
            (data.leaving_date = visitor.leaving_date),
              (data.host = `${visitor.host.first_name} ${visitor.host.last_name}`);

            history.push(data);
          }
        }
      }

      res.status(200).send({ data: history });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },
  /**
   * Get all single staff visitors
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/staff’
   */
  async getStaffVisitors(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const offset = page * limit - limit;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN' ||
      req.user.role === 'EMPLOYEE' ||
      req.user.role === 'CARE_TAKER' ||
      req.user.role === 'TENANT'
    ) {
      try {
        let data = '';
        const company = await UserControllerClone.getCompany(req, res);
        if (!req.user.workspace_company || company.options === 'office') {
          data = await visitors.findAndCountAll({
            where: {
              company: req.user.company,
              staff: req.user.id
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else if (company && company.options === 'workspace') {
          data = await visitors.findAndCountAll({
            where: {
              company: req.user.company,
              workspace_company: req.user.workspace_company,
              staff: req.user.id
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else if (company && company.options === 'estate') {
          data = await visitors.findAndCountAll({
            where: {
              company: req.user.company,
              estate_house: req.user.estate_house,
              staff: req.user.id
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else return res.status(404).send('Other options are not avalaible yet');
        res.status(200).send({ data });
      } catch (err) {
        res.status(500).send('internal server error');
      }
    } else {
      res.status(401).send('Unauthorized');
    }
  },
  /**
   * Get all visitors
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor’
   */
  async getVisitors(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const offset = page * limit - limit;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      try {
        let data = '';
        const company = await UserControllerClone.getCompany(req, res);
        if (!req.user.workspace_company || company.options === 'office') {
          data = await visitors.findAndCountAll({
            where: {
              company: req.user.company,
              location: req.user.location,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else if (company && company.options === 'workspace') {
          data = await visitors.findAndCountAll({
            where: {
              company: req.user.company,
              location: req.user.location,
              workspace_company: req.user.workspace_company,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else if (company && company.options === 'estate') {
          data = await visitors.findAndCountAll({
            where: {
              company: req.user.company,
              location: req.user.location,
              estate_house: req.user.estate_house,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else return res.status(404).send('Other options are not avalaible yet');
        return res.status(200).send({ data });
      } catch (err) {
        console.log(err)
        res.status(500).send('internal server error');
      }
    } else {
      res.status(401).send('Unauthorized');
    }
  },
  /**
   * Filter visitors by host
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/hosts/:host’
   */
  async getVisitorsByHost(req, res){
    let { page, limit } = req.query;
    const {host} = req.params;
    page = Number(page) || 1;
    limit = Number(limit) || 20;

    const offset = page * limit - limit;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      try{
        const data = await visitors.findAndCountAll({
          where: {
            company: req.user.company,
            location: req.user.location,
            staff: host,
            visiting_date: { [Op.not]: null }
          },
          attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
          include: [
            {
              model: visitor_field,
              as: 'fields',
              attributes: ['id', 'field_name', 'field_value']
            }
          ],
          distinct: true,
          order: [['visiting_date', 'DESC']],
          offset,
          limit
        });
        res.status(200).send({ data });
      }catch(err){
        console.log(err);
        res.status(500).send('internal server error')
      } 
    }else return res.status(401).send('Unauthorized')
  },
  /**
   * Filter visitors by visit purpose
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/purposes/:purpose’
   */
  async getVisitorsByPurpose(req, res){
    let { page, limit } = req.query;
    const {purpose} = req.params;
    page = Number(page) || 1;
    limit = Number(limit) || 20;

    const offset = page * limit - limit;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      try{
        const data = await visitors.findAndCountAll({
          where: {
            company: req.user.company,
            location: req.user.location,
            visiting_date: { [Op.not]: null }
          },
          attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
          include: [
            {
              model: visitor_field,
              as: 'fields',
              where: {
                field_value: purpose,
              },
              attributes: ['id', 'field_name', 'field_value']
            }
          ],
          distinct: true,
          order: [['visiting_date', 'DESC']],
          offset,
          limit
        });
        res.status(200).send({ data });
      }catch(err){
        console.log(err);
        res.status(500).send('internal server error')
      } 
    }else return res.status(401).send('Unauthorized')
  },
  /**
   * Get all signed in visitors
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/signed-in-visitors’
   */
  async getSignedInVisitors(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 20;

    const offset = page * limit - limit;
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      try {
        let data = '';
        const company = await UserControllerClone.getCompany(req, res);
        if (!req.user.workspace_company || company.options === 'office') {
          data = await visitors.findAndCountAll({
            where: {
              company: req.user.company,
              location: req.user.location,
              leaving_date: null,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else if (company && company.options === 'workspace') {
          data = await visitors.findAndCountAll({
            where: {
              company: req.user.company,
              location: req.user.location,
              workspace_company: req.user.workspace_company,
              leaving_date: null,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else if (company && company.options === 'estate') {
          data = await visitors.findAndCountAll({
            where: {
              company: req.user.company,
              location: req.user.location,
              // estate_house: req.user.estate_house,
              leaving_date: null,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else return res.status(404).send('Other options are not avalaible yet');
        res.status(200).send({ data });
      } catch (err) {
        console.log(err)
        res.status(500).send('Internal server error');
      }
    } else {
      res.status(401).send('Unauthorizd');
    }
  },
  /**
   * Get visitors between date range
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/date-range-visitors’
   */
  async getVisitorsByDate(req, res) {
    let { page, limit, from, to } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;
    console.log(to, from)
    const offset = page * limit - limit;
    let dateFrom = new Date(from); //.setHours(00, 00, 00);

    let dateTo = new Date(to);
    let toDate = new Date(
      `${dateTo.getFullYear()}-${dateTo.getMonth()+1}-${dateTo.getDate()}`
    );
    const date = new Date(
      `${dateFrom.getFullYear()}-${dateFrom.getMonth()+1}-${dateFrom.getDate()}`
    );
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      try {
        let data = '';
        const company = await UserControllerClone.getCompany(req, res);
        if (!req.user.workspace_company || company.options === 'office') {
          data = await visitors.findAndCount({
            where: {
              visiting_date: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else if (company && company.options === 'workspace') {
          data = await visitors.findAndCount({
            where: {
              visiting_date: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location,
              workspace_company: req.user.workspace_company,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else if (company && company.options === 'estate') {
          data = await visitors.findAndCount({
            where: {
              visiting_date: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location,
              estate_house: req.user.estate_house,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else return res.status(404).send('Other options are not avalaible yet');
        res.status(200).send({ data });
      } catch (err) {
        res.status(500).send('Internal server error');
      }
    } else {
      res.status(401).send('Unauthorized');
    }
  },
   /**
   * Export to csv file visitors list for
   * current day
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/log/export’
   */
  async exportVisitors(req, res) {
    try {
      const { user, useCase='all' } = req.query; // current user id
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
          let data;
         if(useCase === 'signed_in'){
          const visitors = await visitors.findAll({
            where: {
              company: staff.company,
              location: staff.location,
              leaving_date: null
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            order: [['visiting_date', 'DESC']],
          });
          data = visitors.map(visitor => {
            const phoneField = visitor.fields.find(field => field.field_name === 'phone_number');
            const nameField = visitor.fields.find(field => field.field_name === 'name');
            const purposeField = visitor.fields.find(field => field.field_name === 'purpose');

            const theData = {
              name: nameField.field_value,
              phone: phoneField.field_value,
              purpose: purposeField.field_value,
              in: visitor.visiting_date,
              out: visitor.leaving_date
            }
            return theData;
          })
        }else if (useCase === 'all'){
          const visitors = await visitors.findAll({
            where: {
              company: staff.company,
              location: staff.location
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            order: [['visiting_date', 'DESC']],
          });
          data = visitors.map(visitor => {
            const phoneField = visitor.fields.find(field => field.field_name === 'phone_number');
            const nameField = visitor.fields.find(field => field.field_name === 'name');
            const purposeField = visitor.fields.find(field => field.field_name === 'purpose');

            const theData = {
              name: nameField.field_value,
              phone: phoneField.field_value,
              purpose: purposeField.field_value,
              in: visitor.visiting_date,
              out: visitor.leaving_date
            }
            return theData;
          })
        } 
        else if (useCase === 'my'){
          const visitors = await visitors.findAll({
            where: {
              company: staff.company,
              location: staff.location,
              staff: staff.id
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            order: [['visiting_date', 'DESC']],
          });
          data = visitors.map(visitor => {
            const phoneField = visitor.fields.find(field => field.field_name === 'phone_number');
            const nameField = visitor.fields.find(field => field.field_name === 'name');
            const purposeField = visitor.fields.find(field => field.field_name === 'purpose');

            const theData = {
              name: nameField.field_value,
              phone: phoneField.field_value,
              purpose: purposeField.field_value,
              in: visitor.visiting_date,
              out: visitor.leaving_date
            }
            return theData;
          })
        }
          else if (useCase === 'one_week_ago'){
            let now = new Date(); //.setHours(00, 00, 00);

    //Change it so that it is 7 days in the past.
    var pastDate = now.getDate() - 7;
    now.setDate(pastDate);
    let dateTo = new Date();
    let toDate = new Date(
      `$${dateTo.getMonth() + 1}/$${dateTo.getDate()}/$${dateTo.getFullYear()}`
    );
    const date = new Date(`$${now.getMonth() + 1}/$${now.getDate()}/$${now.getFullYear()}`);

            const visitors = await visitors.findAll({
              where: {
                visiting_date: {
                  $between: [date, toDate]
                },
                company: staff.company,
                location: staff.location
              },
              attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
              include: [
                {
                  model: visitor_field,
                  as: 'fields',
                  attributes: ['id', 'field_name', 'field_value']
                }
              ],
              order: [['visiting_date', 'DESC']],
            });
            data = visitors.map(visitor => {
              const phoneField = visitor.fields.find(field => field.field_name === 'phone_number');
              const nameField = visitor.fields.find(field => field.field_name === 'name');
              const purposeField = visitor.fields.find(field => field.field_name === 'purpose');
  
              const theData = {
                name: nameField.field_value,
                phone: phoneField.field_value,
                purpose: purposeField.field_value,
                in: visitor.visiting_date,
                out: visitor.leaving_date
              }
              return theData;
            })
          }
          else {
            const visitors = await visitors.findAll({
              where: {
                company: staff.company,
                location: staff.location
              },
              attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
              include: [
                {
                  model: visitor_field,
                  as: 'fields',
                  attributes: ['id', 'field_name', 'field_value']
                }
              ],
              order: [['visiting_date', 'DESC']],
            });
            data = visitors.map(visitor => {
              const phoneField = visitor.fields.find(field => field.field_name === 'phone_number');
              const nameField = visitor.fields.find(field => field.field_name === 'name');
              const purposeField = visitor.fields.find(field => field.field_name === 'purpose');
  
              const theData = {
                name: nameField.field_value,
                phone: phoneField.field_value,
                purpose: purposeField.field_value,
                in: visitor.visiting_date,
                out: visitor.leaving_date
              }
              return theData;
            })
          }
          const fields = [
            'name', 'phone', 'purpose', 'in', 'out'
          ]
          csv = parse(data, { fields });
          fs.writeFile(filePath, csv, function(err) {
            if (err) {
              return res.status(500).json('internal server error');
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
              res.download(filePath, 'visitors.csv');
            }
          });
        
        } else return res.status(400).send('Bad request');
      } else return res.status(400).send('Bad request');
    } catch (err) {
      console.log(err);
      return res.status(400).send('Internal server error');
      
    }
  },
  /**
   * Search visitors
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/search/:search’
   */
  async searchVisitors(req, res) {
    const { search } = req.params;
    const limit = 10;
    const offset = 0;
    const sanitizedSearch = search
      .trim()
      .toLowerCase()
      .replace(/[\W_]+/, '');
    try {
      if (
        req.user.role === 'GLOBAL_ADMIN' ||
        req.user.role === 'LOCATION_ADMIN' ||
        req.user.role === 'FRONT_DESK_ADMIN' ||
        req.user.role === 'CARE_TAKER'
      ) {
        const field = await visitor_field.findOne({
          where: {
            [Op.or]: sequelize.where(
              sequelize.fn('lower', sequelize.col('field_value')),
              'LIKE',
              `%${sanitizedSearch}%`
            )
          }
        });
        let data = { count: 0, rows: [] };
        if (field) {
          const company = await UserControllerClone.getCompany(req, res);
          if (!req.user.workspace_company || company.options === 'office') {
            data = await visitors.findAndCountAll({
              where: {
                id: field.visitor,
                company: req.user.company,
                location: req.user.location,
                visiting_date: { [Op.not]: null }
              },
              attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
              include: [
                {
                  model: visitor_field,
                  as: 'fields',
                  attributes: ['id', 'field_name', 'field_value']
                }
              ],
              offset,
              limit
            });
          } else if (company && company.options === 'workspace') {
            data = await visitors.findAndCount({
              where: {
                id: field.visitor,
                company: req.user.company,
                location: req.user.location,
                workspace_company: req.user.workspace_company,
                visiting_date: { [Op.not]: null }
              },
              attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
              include: [
                {
                  model: visitor_field,
                  as: 'fields',
                  attributes: ['id', 'field_name', 'field_value']
                }
              ],
              offset,
              limit
            });
          } else if (company && company.options === 'estate') {
            data = await visitors.findAndCount({
              where: {
                id: field.visitor,
                company: req.user.company,
                location: req.user.location,
                estate_house: req.user.estate_house,
                visiting_date: { [Op.not]: null }
              },
              attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
              include: [
                {
                  model: visitor_field,
                  as: 'fields',
                  attributes: ['id', 'field_name', 'field_value']
                }
              ],
              offset,
              limit
            });
          } else return res.status(200).send(data);
          return res.status(200).send({ data });
        } else {
          return res.status(200).send(data);
        }
      } else {
        return res.status(401).send('unauthorized access');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  },
  /**
   * Get last 7 days visitors
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/week-ago-visitors’
   */
  async getLast7DaysVisitors(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const offset = page * limit - limit;

    let now = new Date(); //.setHours(00, 00, 00);

    //Change it so that it is 7 days in the past.
    var pastDate = now.getDate() - 7;
    now.setDate(pastDate);
    let dateTo = new Date();
    let toDate = new Date(
      `$${dateTo.getMonth() + 1}/$${dateTo.getDate()}/$${dateTo.getFullYear()}`
    );
    const date = new Date(`$${now.getMonth() + 1}/$${now.getDate()}/$${now.getFullYear()}`);

    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      try {
        let data = '';
        const company = await UserControllerClone.getCompany(req, res);
        if (!req.user.workspace_company || company.options === 'office') {
          data = await visitors.findAndCount({
            where: {
              visiting_date: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'avatar', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else if (company && company.options === 'workspace') {
          data = await visitors.findAndCount({
            where: {
              visiting_date: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location,
              workspace_company: req.user.workspace_company,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'avatar', 'field_name', 'field_value']
              }
            ],
            distinct: true,
            order: [['visiting_date', 'DESC']],
            offset,
            limit
          });
        } else if (company && company.options === 'estate') {
          data = await visitors.findAndCount({
            where: {
              visiting_date: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location,
              estate_house: req.user.estate_house,
              visiting_date: { [Op.not]: null }
            },
            attributes: ['id', 'visiting_date', 'leaving_date', 'short_id'],
            include: [
              {
                model: visitor_field,
                as: 'fields',
                attributes: ['id', 'avatar', 'field_name', 'field_value']
              }
            ],
            offset,
            limit
          });
        } else return res.status(404).send('Other options are not avalaible yet');
        res.status(200).send({ data });
      } catch (err) {
        res.status(500).send('Internal server error');
      }
    } else {
      res.status(401).send('Unauthorized');
    }
  },
  /**
   * Register a new visitor
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route POST: ‘/api/v1/visitor’
   */
  async registerVisitor(req, res) {
    const data = req.body;
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'CARE_TAKER'
    ) {
      try {
        const { errors } = validateOfficeVisitor(req.body);
        // Check Validation
        if (errors.length) {
          return res.status(400).send(errors[0]);
        }
        // if visitor is on exhibition, register visitor as exhibition
        if (data.purpose === 'exhibition') {
          VisitorController.regisiterExhibitionVisitor(req, res);
        } else {
          const comp = await UserControllerClone.getCompany(req, res);

          let defaultStaff = null;
          let theCompany = null;
          let blockNum = null;

          if (comp.options === 'workspace') {
            theCompany = req.body.company || req.user.workspace_company;
            console.log("----------------",req.user)

            if (!theCompany) return res.status(400).send('workspace company is required');
          }
          if (comp.options === 'estate') {
            blockNum = req.body.estate_house || req.user.estate_house;

            if (!blockNum) return res.status(400).send('House Block number of visit is required');
          }
          let host = null;
          if (!data.staff) {
            const defaultHost = await default_host.findOne({
              where: {
                company: req.user.company,
                location: req.user.location,
                workspace_company: theCompany,
                estate_house: blockNum
              }
            });
            if (defaultHost) {
              host = defaultHost.staff_id;
              defaultStaff = defaultHost.staff_id;
            }
          } else {
            host = data.staff;
          }
          const visitor = await visitors.create({
           
            id: null,
            visiting_date: Date.now(),
            location: req.user.location,
            company: req.user.company,
            workspace_company: theCompany,
            estate_house: blockNum,
            short_id: randomstring.generate(6),
            staff: host
          });
          console.log('yyyyyyyyeeeeeeeeeeeeeesssssssssssss1', visitor)
          for (const field in data) {
            if (data.hasOwnProperty(field)) {
              console.log('yyyyyyyyeeeeeeeeeeeeeesssssssssssss')
              await visitor_field.create({
                field_name: field,
                field_value: data[field],
                visitor: visitor.id,
                company: req.user.company,
                location: req.user.location
              });
            }
          }
          visitorEvents.default.emit('sendWelcomeMessage', data, visitor);
          if (data.staff) {
            const staff = await VisitorController.visitorSuiteMessageOption(data.staff);

            const payload = {
              staff_id: staff.id,
              id: visitor.id,
              short_id: visitor.short_id,
              company: visitor.company,
              workspace_company: theCompany,
              estate_house: blockNum
            };
            let token = jwty.encode(payload, secretKey);
            token = `${baseUrl}/api/v1/visitor/action/${token}`;
            const { url } = await settingsController.init(token);

            visitorEvents.default.emit(
              'staffNotification',
              staff,
              data.name,
              data.private_note,
              data.purpose,
              url
            );
          } else {
            const payload = {
              staff_id: host,
              id: visitor.id,
              short_id: visitor.short_id,
              company: visitor.company,
              workspace_company: theCompany,
              estate_house: blockNum
            };
            let token = jwty.encode(payload, secretKey);
            token = `${baseUrl}/api/v1/visitor/action/${token}`;
            const { url } = await settingsController.init(token);

            if (defaultStaff)
              visitorEvents.default.emit(
                'notifyDefaultHost',
                req.user.company,
                data.name,
                data.private_note,
                data.purpose,
                url,
                theCompany,
                blockNum,
                req.user.location
              );
          }
          // Get settings config for this visitor type
          let isPhoto_required = false;
          const visitTypeConfig = await visit_types_config.findOne({
            where: {
              company: req.user.company,
              location: req.user.location,
              visit_type: data.purpose
            }
          });
          // Get general configs
          const configs = await company_configurations.findOne({
            where: {
              company: req.user.company,
              location: req.user.location
            }
          });
          if (visitTypeConfig) {
            isPhoto_required = visitTypeConfig.isPhoto_required;
          } else {
            isPhoto_required = configs.isPhoto_required;
          }

          return res.status(200).json({
            status: 'success',
            data: visitor,
            isPhoto_required
          });
        }
      } catch (err) {
        console.log("iiiiiiiiiippppppppppppppppi",err);
        res.status(500).send('internal server error');
      }
    } else {
      return res.status(400).send('Access Denied');
    }
  },
  /**
   * Register visitors on exhibition
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   */
  async regisiterExhibitionVisitor(req, res) {
    const data = req.body;
    const comp = await UserControllerClone.getCompany(req, res);
    let theCompany = null;
    if (comp.options === 'workspace') {
      theCompany = req.body.company || req.user.workspace_company;

      if (!theCompany) return res.status(400).send('workspace company is required');
    }

    try {
      const visitor = await visitors.create({
        id: null,
        visiting_date: Date.now(),
        company: req.user.company,
        location: req.user.location,
        workspace_company: theCompany,
        short_id: randomstring.generate(6),
        staff: null
      });
      for (const field in data) {
        if (data.hasOwnProperty(field)) {
          await visitor_field.create({
            location: req.user.location,
            company: req.user.company,
            field_name: field,
            field_value: data[field],
            visitor: visitor.id
          });
        }
      }
      visitorEvents.default.emit('sendWelcomeMessage', data, visitor);
      return res.status(200).json({
        status: 'success',
        data: visitor,
        isPhoto_required: false
      });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },
  /**
   * Delete a single visitor
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route DELETE: ‘/api/v1/visitor/:id’
   */
  async deleteVisitor(req, res) {
    const { id } = req.params;
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'CARE_TAKER'
    ) {
      try {
        const visitor = await visitors.findOne({
          where: {
            id
          }
        });
        if (visitor) {
          await visitor_field.destroy({
            where: {
              visitor: id
            }
          })
          await visitors.destroy({
            where: {
              id
            }
          });
          return res.status(200).send({ message: 'Visitor deleted' });
        }
        return res.status(400).send('Visitor does not exist');
      } catch (err) {
        console.log(err);
        res.status(500).send('Internal server error');
      }
    } else {
      res.status(401).send('unauthorized action');
    }
  },
  /**
   * Get final screen welcome message
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/welcome-message/:visit-type’
   */

  async getWelcomeMessage(req, res) {
    const { visit_type } = req.params;
    try {
      let welcomeMessage = { type: null };
      const visitTypeConfig = await visit_types_config.findOne({
        where: {
          company: req.user.company,
          location: req.user.location,
          visit_type
        }
      });
      if (visitTypeConfig) {
        // check if it is txt message, image or video
        // that is enabled on welcome screen for this visit type
        switch (visitTypeConfig.welcome_message) {
          case 'text':
            {
              const textMessage = await VisitorWelcomeMessage.findOne({
                where: {
                  company: req.user.company,
                  location: req.user.location,
                  visit_type
                }
              });
              if (textMessage) {
                welcomeMessage.type = 'text';
                welcomeMessage.text = textMessage.message;
              }
            }
            break;
          case 'image':
            {
              const imageMessage = await CompanyWelcomeGraphic.findOne({
                company: req.user.company,
                location: req.user.location,
                visit_type
              });
              if (imageMessage) {
                welcomeMessage.type = 'image';
                welcomeMessage.image = imageMessage.graphic;
              }
            }
            break;
        }
      } else {
        // if none is set for this visit type, use the general welcome image
        const defaultImage = await CompanyWelcomeGraphic.findOne({
          where: {
            company: req.user.company,
            location: req.user.location,
            visit_type: null
          }
        });
        if (defaultImage) {
          welcomeMessage.type = 'image';
          welcomeMessage.image = defaultImage.graphic;
        }
      }
      return res.status(200).send({ data: welcomeMessage });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },
  /**
   * import data of companies customers.
   * this is in order to auto recorgnise them
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route POST: ‘/api/v1/visitor/bulk-import’
   */
  async bulkImport(req, res) {
    if (req.user.role === 'GLOBAL_ADMIN' || req.user.role === 'LOCATION_ADMIN') {
      const form = new formidable.IncomingForm();
      const files = await new Promise(function(resolve, reject) {
        form.parse(req, function(err, fields, files) {
          if (err) {
            reject(err);
            return;
          }
          resolve(files);
        });
      });
      const { visitorCsv } = files;
      if (visitorCsv.type !== 'text/csv')
        return res.status(400).send('Only csv files can be imported');
      let visitors = [];
      csv
        .parseFile(visitorCsv.path, {
          headers: true,
          ignoreEmpty: true
        })
        .on('data', function(data) {
          // console.log(data, "lllllllllllllllllll")
          visitors.push(data);
        })
        .on('end', function() {
          VisitorController.addVisitor(req, res, visitors);
        });
    } else {
      return res.status(401).send('Unauthorized');
    }
  },
  /**
   * add imported visitors
   * @param {object} req req obj
   * @param {object} res res obj
   * @param {object} visitors visitors data
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/staff’
   */
  async addVisitor(req, res, visitors1) {
    console.log(visitors1)
    try {
      for (let i = 0; i < visitors1.length; i += 1) {
        const data = visitors1[i];

        const visitor = await visitors.create({
          id: null,
          visiting_date: null,
          company: req.user.company,
          location: req.user.location,
          short_id: shortid.generate(),
          staff: null,
          workspace_company: req.user.workspace_company
        });
        console.log('oweiewoiiiiioooooooooooooooooooo', data.company)
        for (const field in data) {
          if (data.hasOwnProperty(field)) {
            await visitor_field.create({
              field_name: field,
              field_value: data[field],
              visitor: visitor.id,
              // company: null

            });
          }
        }
      }
      return res.status(200).send({ message: `${visitors1.length} visitors has been added` });
    } catch (err) {
      console.log(err);
    }
  },
  /**
   * import data of companies visitor directory.
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route POST: ‘/api/v1/visitor/import-directory’
   */
  async importDirectory(req, res) {
    if (req.user.role === 'GLOBAL_ADMIN' || req.user.role === 'LOCATION_ADMIN') {
      const form = new formidable.IncomingForm();
      const files = await new Promise(function(resolve, reject) {
        form.parse(req, function(err, fields, files) {
          if (err) {
            reject(err);
            return;
          }
          resolve(files);
        });
      });
      const { file } = files;
      if (file.type !== 'text/csv')
        return res.status(400).send('Only csv files can be imported');
      let visitors = [];
      csv
        .parseFile(file.path, {
          headers: true,
          ignoreEmpty: true
        })
        .on('data', function(data) {
          visitors.push(data);
        })
        .on('end', function() {
          VisitorController.addDirectory(req, res, visitors);
        });
    } else {
      return res.status(401).send('Unauthorized');
    }
  },
  async addDirectory(req, res, visitors){
    try {
      for(let i=0; i<visitors.length; i+=1){
        let datum = visitors[i]

        await contact_directory.create({
          name: datum.name,
          phone: datum.phone,
          email: datum.email,
          type: datum.type,
          company: req.user.company,
          location: req.user.location,
          workspace_company: req.user.workspace_company,
          estate_house: req.user.estate_house
        })
      }
      return res.status(201).send({
        message: 'Records added'
      })
    } catch (err) {
      console.log(err)
      res.status(500).send('internal server error')
    }
  },
  async addOneDirectory(req, res){
    try {
     
        let datum = req.body;

        const data = await contact_directory.create({
          name: datum.name,
          phone: datum.phone,
          email: datum.email,
          type: datum.type,
          company: req.user.company,
          location: req.user.location,
          workspace_company: req.user.workspace_company,
          estate_house: req.user.estate_house
        })
      return res.status(201).send({
        message: 'Record added',
        data
      })

    } catch (err) {
      console.log(err)
      res.status(500).send('internal server error')
    }
  },

  
  async getDirectoryRecord(req, res){
    try {
      const record = await contact_directory.findAndCountAll({
        where: {
          company: req.user.company,
          location: req.user.location,
          workspace_company: req.user.workspace_company,
          estate_house: req.user.estate_house
        }
      })
      return res.status(200).send({
        data: record
      })
    } catch (err) {
      console.log(err)
      res.status(500).send('internal server error')
    }
  },
  async getOneDirectoryRecord(req, res){
    try {
      const {id} = req.params;

      const record = await contact_directory.findOne({
        where: {
          id
        }
      })

      return res.status(200).send({data: record})
    } catch (err) {
      console.log(err)
      res.status(500).send('internal server error')
    }
  },
  async editDirectoryRecord(req, res){
    try {
      const {id} = req.params;
      const record = await contact_directory.findOne({
        where: {
          id
        }
      })
      if(record){
        await contact_directory.update(
          {
            ...req.body
          },
          {
            where: {
              id
            }
          }
        )
        VisitorController.getOneDirectoryRecord(req, res);
      } else {
        return res.status(404).send('Recor not found')
      }
    } catch (err) {
      console.log(err)
      res.status(500).send('internal server error')
    }
  },
  async deleteDirectoryRecord(req, res){
    if(req.user.role === 'GLOBAL_ADMIN' || 
    req.user.role === 'LOCATION_ADMIN' || 
    req.user.role === 'FRONT_DESK_ADMIN'
    ) {
    try {
      const {id} = req.params;
      const record = await contact_directory.findOne({
        where: {
          id
        }
      })
      if(record){
        await contact_directory.destroy(
          {
            where: {id}
          }
        )
        return res.status(200).send({
          message: 'Record deleted'
        })
      } else {
        return res.status(404).send('Record not found')
      }
    } catch (err) {
      console.log(err)
      res.status(500).send('internal server error')
    }
  } return res.status(401).send('unauthorized')
  },
  /**
   * Download directory csv file sample
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/visitor/directory/sample'
   */
  downloadDirectoryCsveSample(req, res) {
    try {
      const filePath = path.resolve(
        __dirname,
        '../../',
        'src/upload',
        'sample',
        'directory_sample.csv'
      );
      res.download(filePath, 'directory_sample.csv');
    } catch (err) {
      console.log(err);
    }
  },
  async searchDirectory(req, res){
    const {search} = req.params;
    const limit = 10;
    const offset = 0;
    const sanitizedSearch = search
      .trim()
      .toLowerCase()
      .replace(/[\W_]+/, '');
    try {
    const data = await   contact_directory.findAndCountAll({
      where: {
        [Op.or]: sequelize.where(
          sequelize.fn('lower', sequelize.col('name')),
          'LIKE',
          `%${sanitizedSearch}%`
        ),
        company: req.user.company,
        workspace_company: req.user.workspace_company,
        estate_house: req.user.estate_house,
      },
      limit,
      offset
    })
    return res.status(200).send({
      data
    })
    } catch (err) {
      console.log(err)
      res.status(500).send('internal server error')
    }
  },
  /**
   * Download directory csv file sample
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/visitor/directory/sample'
   */
  downloadDirectoryCsveSample(req, res) {
    try {
      const filePath = path.resolve(
        __dirname,
        '../../',
        'src/upload',
        'sample',
        'directory_sample.csv'
      );
      res.download(filePath, 'directory_sample.csv');
    } catch (err) {
      console.log(err);
    }
  },
  /**
   * Download contact csv file sample
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @route GET: '/api/v1/visitor/contact/sample'
   */
  downloadContactCsveSample(req, res) {
    try {
      const filePath = path.resolve(
        __dirname,
        '../../',
        'src/upload',
        'sample',
        'contact_sample.csv'
      );
      res.download(filePath, 'contact_sample.csv');
    } catch (err) {
      console.log(err);
    }
  },
  /**
   * Add visitor picture
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object’
   */
  async editOfficeVisitorPicture(req, res) {
    const { id } = req.params;
    if (!req.file)
      return res.status(400).send({
        status_code: 400,
        message: 'visitor image is required!'
      });
    try {
      const visitor = await visitors.findOne({
        where: {
          id,
          company: req.user.company
        }
      });
      if (visitor) {
        let datauri = dataUri(req.file).content;
        visitorEvents.default.emit('uploadAvatar', uploader, datauri, visitor.id);
        res.status(200).send({ message: 'Profile picture updated', status: 'success' });
      } else {
        res.status(404).send('Visitor does not exist');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal server error');
    }
  },
  /**
   * Add visitor picture after sign in
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route POST: ‘/api/v1/visitor/picture/:id’
   */
  editVisitorPicture(req, res) {
    if (
      req.user.role === 'GLOBAL_ADMIN' ||
      req.user.role === 'LOCATION_ADMIN' ||
      req.user.role === 'FRONT_DESK_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      visitorsuite_company.findOne({
        where: {
          id: req.user.company
        }
      }).then(result => {
        VisitorController.editOfficeVisitorPicture(req, res);
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  /**
   * Get one visitor by id
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/:id’
   */
  async getVisitorById(req, res) {
    const { id } = req.params;
    try {
      const visitor = await visitors.findOne({
        where: {
          id
        },
        include: [
          {
            model: visitor_field,
            as: 'fields',
            attributes: ['id', 'field_name', 'field_value']
          },
          {
            model: visitorsuite,
            as: 'host',
            attributes: ['id', 'first_name', 'last_name', 'assistant']
          }
        ]
      });
      return res.status(200).send({ data: visitor });
    } catch (err) {
      return res.status(500).send('internal server error');
    }
  },
  /**
   * Get visitor by short id
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   */
  async getOfficeVisitorById(req, res) {
    const { id } = req.params;
    try {
      const visitor = await visitors.findOne({
        where: {
          id
        },
        include: [
          {
            model: visitor_field,
            as: 'fields',
            attributes: ['id', 'field_name', 'field_value']
          },
          {
            model: VisitorSuite,
            as: 'host',
            attributes: ['id', 'first_name', 'last_name', 'assistant']
          }
        ]
      });
      return res.status(200).send({ data: visitor });
    } catch (err) {
      return res.status(500).send('internal server error');
    }
  },
  /**
   * Get visitor by short id
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   */
  getOfficeVisitorByShortId(req, res) {
    const { id } = req.params;
    visitors.findOne({
      where: {
        short_id: String(id),
        company: req.user.company
      }
    }).then(result => {
      if (result) {
        req.params.id = result.id;
        const { id } = req.params;
        VisitorController.getOfficeVisitorById(req, res);
      } else {
        return res.status(400).send('No visitor with this id');
      }
    });
  },
  /**
   * Sign out a visitor
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route PUT: ‘/api/v1/visitor/leaving/:id’
   */
  editVisitorLastSeenById(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      visitorsuite_company.findOne({
        where: {
          id: req.user.company
        }
      }).then(result => {
        VisitorController.editOfficeVisitorLastSeenById(req, res);
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  /**
   * Handle visitor sign out
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route PUT: ‘/api/v1/visitor/staff’
   */
  editOfficeVisitorLastSeenById(req, res) {
    const { id } = req.params;
    company_configurations.findOne({
      where: {
        company: req.user.company,
        location: req.user.location
      }
    }).then(company => {
      // checks if self sign out settings is turned on
      if (!company.self_signout) {
        return res.status(401).send('Sorry, visitors are not allowed to self sign out!');
      } else {
        visitors.findOne({
          where: {
            id,
            company: req.user.company,
            location: req.user.location
          }
        }).then(result => {
          if (result) {
            visitors.update({ leaving_date: Date.now() }, { where: { id: result.id } }).then(() => {
              visitors.findOne({ where: { id } }).then(visitor => {
                return res.status(200).send({ data: visitor });
              });
            });
          } else {
            return res.status(404).send('No visitor found');
          }
        });
      }
    });
  },
  /**
   * Sign out a visitor by short id through e-barg
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route PUT: ‘/api/v1/visitor/leaving/ex/:id’
   */
  async editVisitorLastSeenByShortId(req, res) {
    const { id } = req.params;
    try {
      const visitor = await visitors.findOne({
        where: {
          short_id: String(id)
        }
      });
      if (visitor) {
        const configs = await company_configurations.findOne({
          where: { company: visitor.company, location: visitor.location }
        });
        // check if visitors can self sign out
        if (!configs.self_signout)
          return res.status(400).send('Sorry, visitors are not allowed to self sign out');
        await visitors.update(
          { leaving_date: Date.now() },
          {
            where: { id: visitor.id }
          }
        );
        return res.status(200).send({ message: 'You have been sucessfully logged out!' });
      }
      return res.status(400).send('Visitor not found');
    } catch (err) {
      res.status(500).send('Internal server error');
    }
  },
  /**
   * Add visitor picture after sign in
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route PUT: ‘/api/v1/visitor/ext/:id’
   */
  getVisitorByShortId(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      visitorsuite_company.findOne({
        where: {
          id: req.user.company
        }
      }).then(result => {
        VisitorController.getOfficeVisitorByShortId(req, res);
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  /**
   * Send visitor visit invite
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route POST: ‘/api/v1/visitor/set-appointment’
   */
  async setAppointment(req, res) {
    const company = await UserControllerClone.getCompany(req, res);
  try{
    if (company.options === 'office') {
      VisitorController.setOfficeAppointment(req, res);
    } else if (company.options === 'workspace') {
      const { errors, isValid } = validateSetAppoint(req.body);
      // Check Validation
      if (errors.length) {
        return res.status(400).json(errors[0]);
      }
      const data = req.body;
      let workspace_company = '';

      // check if workspace admin and validate for workspace company in req body
      if (!req.user.workspace_company) {
        if (!req.body.workspace_company)
          return res.status(400).send('Work space company is required');
        workspace_company = req.body.workspace_company;
      } else {
        workspace_company = req.user.workspace_company;
      }
      visitorsuite_appointment.create({
        id: null,
        appointment_id: randomstring.generate(6),
        day_of_appoint: data.day,
        time_of_appoint: data.time,
        staff_id: data.staff,
        is_active: 1,
        company: req.user.company,
        location: req.user.location,
        workspace_company,
        apointee_name: data.name,
        apointee_email: data.email,
        purpose: data.purpose,
        phone_number: data.phone_number,
        acknowledge: 0,
        attended: 0,
        type: 'client',
        uid: randomstring.generate(6)
      }).then(result => {
        const payload = {
          appointment_id: result.appointment_id,
          id: result.id,
          company: result.company,
          purpose: data.purpose,
          workspace_company: result.workspace_company
        };
        let token = jwty.encode(payload, secretKey);
        token = `${baseUrl}/api/v1/visitor/appointment/${token}`;
        settingsController.init(token).then(bitly => {
          visitorEvents.default.emit('notifyFrontDesk', result.company, data, result.location);
          visitorEvents.default.emit('notifyVisitor', payload.company, data, bitly.url, result.location);

          return res.status(200).json({
            status: 'success',
            message: 'invite sent',
            data: bitly.url
          });
        });
      });
    } else if (company.options === 'estate') {
      const { errors, isValid } = validateSetAppoint(req.body);
      // Check Validation
      if (errors.length) {
        return res.status(400).json(errors[0]);
      }
      const data = req.body;
      let estate_house = '';

      // check if estate admin and validate for house number in req body
      if (req.user.role === 'GLOBAL_ADMIN') {
        if (!req.body.blockNum) return res.status(400).send('House number is required');
        estate_house = req.body.estate_house;
      } else {
        estate_house = req.user.estate_house;
      }
      visitorsuite_appointment.create({
        id: null,
        appointment_id: randomstring.generate(6),
        day_of_appoint: data.day,
        time_of_appoint: data.time,
        staff_id: data.staff,
        is_active: 1,
        company: req.user.company,
        location: req.user.location,
        estate_house,
        apointee_name: data.name,
        apointee_email: data.email,
        purpose: data.purpose,
        phone_number: data.phone_number,
        acknowledge: 0,
        attended: 0,
        type: 'client',
        uid: randomstring.generate(6)
      }).then(result => {
        const payload = {
          appointment_id: result.appointment_id,
          id: result.id,
          company: result.company,
          purpose: data.purpose,
          estate_house
        };
        let token = jwty.encode(payload, secretKey);
        token = `${baseUrl}/api/v1/visitor/appointment/${token}`;
        settingsController.init(token).then(bitly => {
          visitorEvents.default.emit('notifyFrontDesk', result.company, data, result.location);
          visitorEvents.default.emit('notifyVisitor', payload.company, data, bitly.url, result.location);

          return res.status(200).json({
            status: 'success',
            message: 'invite sent',
            data: bitly.url
          });
        });
      });
    } else {
      return res.status(400).send('Other options are not available yet');
    }
  }catch(err){
      console.log(err, "dkaldsweeowq;oql")
  }
  },
  /**
   * Send visitor invite for office usecase
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   */
  setOfficeAppointment(req, res) {
    const { errors, isValid } = validateSetAppoint(req.body);
    // Check Validation
    if (errors.length) {
      return res.status(400).json(errors[0]);
    }
    const data = req.body;
    visitorsuite_appointment.create({
      id: null,
      appointment_id: randomstring.generate(6),
      day_of_appoint: data.day,
      time_of_appoint: data.time,
      staff_id: data.staff,
      is_active: 1,
      company: req.user.company,
      location: req.user.location,
      apointee_name: data.name,
      apointee_email: data.email,
      purpose: data.purpose,
      phone_number: data.phone_number,
      acknowledge: 0,
      attended: 0,
      type: 'client',
      uid: randomstring.generate(6)
    }).then(result => {
      const payload = {
        appointment_id: result.appointment_id,
        id: result.id,
        company: result.company,
        workspace_company: result.workspace_company,
        purpose: data.purpose
      };
      let token = jwty.encode(payload, secretKey);
      token = `${baseUrl}/api/v1/visitor/appointment/${token}`;
      settingsController.init(token).then(bitly => {
        visitorEvents.default.emit('notifyFrontDesk', result.company, data, result.location);
        visitorEvents.default.emit('notifyVisitor', payload.company, data, bitly.url, result.location);

        return res.status(200).json({
          status: 'success',
          message: 'invite sent',
          data: bitly.url
        });
      });
    });
  },
  /**
   * Send bulk invites to visitors
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route POST: ‘/api/v1/visitor/import’
   */
  async bulkImportInvites(req, res) {
    const form = new formidable.IncomingForm();
    const files = await new Promise(function(resolve, reject) {
      form.parse(req, function(err, fields, files) {
        if (err) {
          reject(err);
          return;
        }
        resolve(files);
      });
    });
    const { invitesCsv } = files; //csv file
    if (invitesCsv.type !== 'text/csv')
      return res.status(400).send('Only csv files can be imported');
    let invites = [];
    csv
      .parseFile(invitesCsv.path, {
        headers: true,
        ignoreEmpty: true
      })
      .on('data', function(data) {
        invites.push(data);
      })
      .on('end', function() {
        VisitorController.sendInvite(req, res, invites);
      });
  },
  /**
   * Download a sample file of invites csv
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/invite-sample’
   */
  downloadInviteSample(req, res) {
    try {
      const filePath = path.resolve(
        __dirname,
        '../../',
        'src/upload',
        'sample',
        'invite_sample.csv'
      );
      res.download(filePath, 'invite_sample.csv');
    } catch (err) {
      console.log(err);
    }
  },
  /**
   * Handle imported ivites send
   * @param {object} req req obj
   * @param {object} res res obj
   * @param {array} invites invites data
   * @returns json object
   */
  async sendInvite(req, res, invites) {
    let row = 0;
    let allErrors = [];
    try {
      for (let i = 0; i < invites.length; i += 1) {
        // validate the invite data
        const { errors } = validateSetAppoint(invites[i]);
        // Check Validation
        if (errors.length) {
          allErrors.push({
            row,
            errors
          });
        } else {
          const data = invites[i];
          const result = await visitorsuite_appointment.create({
            id: null,
            appointment_id: randomstring.generate(6),
            day_of_appoint: data.day,
            time_of_appoint: data.time,
            staff_id: data.staff || null,
            is_active: 1,
            company: req.user.company,
            location: req.user.location,
            workspace_company: req.user.workspace_company,
            estate_house: req.user.estate_house,
            apointee_name: data.name,
            apointee_email: data.email,
            purpose: data.purpose,
            phone_number: data.phone_number,
            acknowledge: 0,
            attended: 0,
            type: 'client',
            uid: randomstring.generate(6)
          });
          const payload = {
            appointment_id: result.appointment_id,
            id: result.id,
            company: result.company,
            purpose: data.purpose
          };

          let token = jwty.encode(payload, secretKey);
          token = `${baseUrl}/api/v1/visitor/appointment/${token}`;

          const bitly = await settingsController.init(token);
          //visitorEvents.default.emit('notifyFrontDesk', payload.company, data);
          visitorEvents.default.emit('notifyVisitor', payload.company, data, bitly.url, req.user.location);
        }
        row += 1;
      }
      const addedRows = invites.length - allErrors.length;
      return res.status(200).send({
        message: `${addedRows} invites sent`,
        errorRows: allErrors
      });
    } catch (err) {
      console.log(err);
    }
  },
  /**
   * set recurring visit
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route POST: ‘/api/v1/visitor/:short_id/recurring-visit’
   */
  async setRecurringVisit(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role === 'CARE_TAKER'
    ) {
      try {
        const { visit_days } = req.body;
        const { short_id } = req.params;

        const visitor = await visitors.findOne({
          where: {
            short_id
          }
        });
        if (visitor) {
          const visitorData = {};

          const visitorFields = await visitor_field.findAll({
            where: {
              visitor: visitor.id
            },
            attributes: ['field_name', 'field_value']
          });

          // get visitor details
          for (let i = 0; i < visitorFields.length; i += 1) {
            const field = visitorFields[i];
            visitorData[field.field_name] = field.field_value;
          }
          // create a recuring visit
          let time_of_appoint = String(
            new Date(visitor.visiting_date).toLocaleTimeString()
          ).substring(0, 4);
          const validDates = [];

          for (let i = 0; i < visit_days.length; i += 1) {
            let day = visit_days[i];

            if (VisitorController.validateDate(day.day_of_appoint)) {
              // check if user already has appointment on this day
              const result = await visitorsuite_appointment.findOne({
                where: sequelize.and(
                  sequelize.where(
                    sequelize.fn('DATE', sequelize.col('day_of_appoint')),
                    '=',
                    day.day_of_appoint
                  ),
                  { uid: visitor.short_id }
                )
              });
              if (!result) {
                await visitorsuite_appointment.create({
                  appointment_id: randomstring.generate(6),
                  day_of_appoint: day.day_of_appoint,
                  time_of_appoint,
                  staff_id: visitor.staff,
                  is_active: 1,
                  company: visitor.company,
                  location: visitor.location,
                  workspace_company: visitor.workspace_company,
                  estate_house: visitor.estate_house,
                  apointee_name: visitorData.name,
                  apointee_email: visitorData.email,
                  purpose: visitorData.purpose,
                  phone_number: visitorData.phone_number,
                  acknowledge: 1,
                  attended: 0,
                  type: 'user',
                  uid: visitor.short_id,
                  body: JSON.stringify(visitorData)
                });
              }
              validDates.push(moment(day.day_of_appoint).format('LL'));
            }
          }
          if (validDates.length) {
            // send visitor details about recurring visit
            const company = await UserControllerClone.getCompany(req, res);

            const message = `Hello ${visitorData.name} <br /> Use this invite id, <b>${
              visitor.short_id
            }</b>
        to check in at ${
          company.name
        } for your subsequent visit on the following days. <br /> <b>${validDates.toString()}</b>. <b>Time: ${time_of_appoint}hrs</b>`;
            await settingsController.sendEmailMessage(
              visitorData.email,
              `Recurring visit at ${company.name}`,
              message
            );
          }

          return res.status(200).send({ message: `${validDates.length} recurring visits set` });
        }
        return res.status(400).send('invalid visitor');
      } catch (err) {
        console.log(err);
        res.status(500).send('internal server error');
      }
    } else {
      return res.status(401).send('Unauthorized user');
    }
  },
  /**
   * Validates date for backdating error
   * @param {string} day date to validate
   * @returns {boolean} true or false
   */
  validateDate(day) {
    console.log(day);
    const date = new Date(day);
    const dateChecker = new Date();

    const isValid =
      date.getFullYear() >= dateChecker.getFullYear() &&
      date.getMonth() + 1 >= dateChecker.getMonth() + 1 &&
      date.getDate() >= dateChecker.getDate();
    // console.log("kkkkkkkkkkkkkkkkkkdddddddddddddddsaaaaaaa",date, dateChecker);
    return isValid;
  },
  /**
   * Get recurring visits
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/:short_id/recurring-visit’
   */
  async getRecurringVisit(req, res) {
    const { short_id } = req.params;
    const today = new Date();
    try {
      const days = await visitorsuite_appointment.findAll({
        where: {
          uid: short_id,
          day_of_appoint: {
            [Op.gt]: new Date(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`)
          }
        },
        attributes: ['day_of_appoint']
      });
      return res.status(200).send({ data: days });
    } catch (err) {
      console.log("ddse",err);
      res.status(500).send('internal server error');
    }
  },
  setDate(req, res) {
    const data = req.body;
    const { errors, isValid } = validateSetAppointDate(data);
    // Check Validation
    if (!isValid) {
      return res.status(400).json(errors);
    }
    return res.status(200).json({
      status: 'success',
      data: VisitorController.setDateFromData(data.day, data.month, data.time)
    });
  },
  setDateFromData(day, month, time) {
    const date = new Date();
    const fullYear = date.getFullYear();
    if (!(String(day).length > 0)) day = date.getDate();
    if (!(String(month).length > 0)) month = month.getMonth();
    if (!(String(time).length > 0)) time = '0';
    time = parseInt(time);
    date.setTime(time * 3.6e6);
    date.setDate(parseInt(day));
    date.setMonth(parseInt(month) - 1);
    date.setFullYear(fullYear);
    return date;
  },
  /**
   * End point when a visitor clicks on an invite link.
   * redirects visitor to invites details page
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/appointment/:who’
   */
  acknowledgeAppointment(req, res) {
    const { who } = req.params; // jwt
    try {
      const payload = jwty.decode(who, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };
      if (doesHaveKey(`appointment_id`) && doesHaveKey(`id`)) {
        visitorsuite_appointment.findOne({
          where: {
            id: payload.id,
            appointment_id: payload.appointment_id,
            acknowledge: 0,
            is_active: 1,
            type: 'client'
          }
        }).then(appointment => {
          res.redirect(`${baseUrl}/acknowledge-appointment?token=${who}`);
        });
      } else {
        res.redirect(`${baseUrl}/not-found`);
      }
    } catch (err) {
      res.redirect(`${baseUrl}/not-found`);
    }
  },
  /**
   * Pre register user and acknowledge appointment
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route POST: ‘/api/v1/visitor/appointment/:who’
   */
  setAcknowledgeAppointment(req, res) {
    const { who } = req.params; // jwt
    try {
      const payload = jwty.decode(who, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };

      if (doesHaveKey(`appointment_id`) && doesHaveKey(`id`)) {
        visitorsuite_appointment.findOne({
          where: {
            id: payload.id,
            appointment_id: payload.appointment_id,
            acknowledge: 0,
            is_active: 1,
            type: 'client'
          }
        }).then(result => {
          if (result) {
            const data = req.body;
            const { errors, isValid } = validateOfficeVisitor(req.body);
            // Check Validation
            if (errors.length) {
              return res.status(400).json(errors[0]);
            }
            const update = () => {
              visitorsuite_appointment.update(
                {
                  acknowledge: 1,
                  body: JSON.stringify(data),
                  phone_number: data.phone_number
                },
                { where: { id: payload.id } }
              ).then(repo => {
                const msg = `Your invite has been acknowledged. \n Date: ${
                  result.day_of_appoint
                } \n Time: ${result.time_of_appoint} \n Purpose: ${data.purpose} \n Invitation id ${
                  result.uid
                }`;
                settingsController
                  .sendEmailMessage(data.email, 'Invite acknowledgement', msg)
                  .then(() => {
                    return res.status(200).json({
                      status: 'success',
                      data: {
                        uid: result.uid,
                        message: `Remember your uid`
                      }
                    });
                  });
              });
            };
            update();
          } else {
            return res.status(400).send('Invite has already been acknowleged or cancelled');
          }
        });
      } else {
        return res.status(400).send('Broken link');
      }
    } catch (err) {
      return res.status(400).send('internal server error');
    }
  },
  async setPicutreAfterAcknowledge(req, res) {
    const { who } = req.params;
    try {
      const payload = jwty.decode(who, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };

      if (doesHaveKey(`appointment_id`) && doesHaveKey(`staff_id`) && doesHaveKey(`id`)) {
        const result = await visitorsuite_appointment.findOne({
          where: {
            id: payload.id,
            staff_id: payload.staff_id,
            appointment_id: payload.appointment_id,
            acknowledge: 1,
            is_active: 1,
            type: 'client'
          }
        });
        if (result) {
          let datauri = dataUri(req.file).content;
          let img = await uploader.upload(datauri, { folder: 'visitorsuite' });
          await visitorsuite_appointment.update({ avatar: img.url }, { where: { id: payload.id } });
          return res.status(200).send('Profile picture updated');
        }
      } else {
        return res.status(404).send('Broken link');
      }
    } catch (err) {
      return res.status(404).send('Broken link');
    }
  },
  /**
   * Get visitor form fields
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/appointment/formdata/:who’
   */
  getDataFormat(req, res) {
    const { who } = req.params;
    try {
      const payload = jwty.decode(who, secretKey);
      const doesKeyExist = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };
      if (doesKeyExist(`appointment_id`) && doesKeyExist(`id`)) {
        visitorsuite_appointment.findOne({
          where: {
            id: payload.id,
            appointment_id: payload.appointment_id,
            acknowledge: 0,
            is_active: 1,
            type: 'client'
          }
        }).then(result => {
          if (result) {
            req.user = { company: payload.company, location: result.location };
            // add the visit type or purpose to the req param
            // this is to get the custom fields for this visit type
            req.params.visit_type = payload.purpose;
            VisitorController.getFormfields(req, res);
          } else {
            return res.status(404).send('Appointment cancelled');
          }
        });
      } else {
        return res.status(404).send('Broken link');
      }
    } catch (err) {
      return res.status(404).send('Broken link');
    }
  },

  ///Not yet tested

  getDataFormat2(req, res) {
    const { who } = req.params;
    if (req.body) {
      VisitorController.aClientScheduled(req, res);
    } else {
      try {
        const payload = jwty.decode(who, secretKey);
        const doesKeyExist = key => {
          return Object.prototype.hasOwnProperty.call(payload, key) || false;
        };
        if (doesKeyExist(`staff`) && doesKeyExist(`company`)) {
          visitorsuite.findOne({
            where: {
              id: payload.staff,
              company: payload.company
            }
          }).then(result => {
            if (result) {
              req.user = result;
              VisitorController.getFormData(req, res);
            } else {
              return res.status(404).send('Error');
            }
          });
        } else {
          return res.status(404).send('Broken link');
        }
      } catch (err) {
        return res.status(404).send('Broken link');
      }
    }
  },
  /**
   * Get visitor invites details
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/get/visitor/appointment/:who’
   */
  getVisitorAppointment(req, res) {
    const { who } = req.params; // jwt
    try {
      const payload = jwty.decode(who, secretKey);
      const doesKeyExist = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };
      if (doesKeyExist(`appointment_id`) && doesKeyExist(`id`)) {
        let companyOption = {};
        if (!payload.workspace_company) {
          companyOption = {
            model: 	visitorsuite_company,
            as: 'companyInfo',
            attributes: ['name']
          };
        } else if (payload.workspace_company) {
          companyOption = {
            model: workspace_company,
            as: 'workspaceCompany',
            attributes: ['name']
          };
        } else {
          return res.status(400).send('Broken link');
        }
        visitorsuite_appointment.findOne({
          where: {
            id: payload.id,
            appointment_id: payload.appointment_id,
            acknowledge: 0,
            is_active: 1,
            type: 'client'
          },
          attributes: [
            'apointee_name',
            'purpose',
            'apointee_email',
            'phone_number',
            'time_of_appoint',
            'day_of_appoint'
          ],
          include: [
            {
              model: 	visitorsuite_company,
              as: 'companyInfo',
              attributes: ['name']
            },
            {
              model: visitorsuite,
              as: 'hostInfo',
              attributes: ['first_name', 'last_name']
            }
          ]
        }).then(result => {
          if (result) {
            return res.status(200).send({ data: result });
          } else {
            return res.status(404).send('Appointment cancelled');
          }
        });
      } else {
        return res.status(404).send('Broken link');
      }
    } catch (err) {
      return res.status(404).send('Broken link');
    }
  },
  /**
   * Get companies added purpose field and it visit options
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/purpose/:token’
   */
  async getCompanyPurposeField(req, res) {
    const { token } = req.params; //jwt
    try {
      const payload = jwty.decode(token, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };
      if (doesHaveKey(`staff`) && doesHaveKey(`company`)) {
        const user = await visitorsuite.findOne({
          where: {
            id: payload.staff
          }
        });
        req.user = user;
        VisitorController.getPurposeField(req, res);
      } else return res.status(400).send('Broken link');
    } catch (err) {
      res.status(500).send('Internal server error');
    }
  },
  /**
   * Visitor preregistration with staff invite link
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route POST: ‘/api/v1/visitor/schedule/:who’
   */
  async aClientOfficeScheduled(req, res) {
    const { who } = req.params; //jwt

    const formatDate = date => {
      let d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return [year, month, day].join('-');
    };
    try {
      const payload = jwty.decode(who, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };
      if (doesHaveKey(`staff`) && doesHaveKey(`company`)) {
        const staff = await visitorsuite.findOne({
          where: {
            id: payload.staff,
            company: payload.company
          }
        });
        if (staff) {
          req.user = staff;
          const data = req.body;
          data.staff = payload.staff;
          const { errors, isValid } = validateOfficeVisitor(data);
          // Check Validation
          if (errors.length) {
            return res.status(400).send(errors[0]);
          }
          const doesHaveDateKey = key => {
            return Object.prototype.hasOwnProperty.call(data, key) || false;
          };

          if (doesHaveDateKey(`day`)) {
            // check if month is backdated
            const date = new Date(data.day);
            const checkMonth = new Date();
            if (parseInt(date.getMonth() + 1) < checkMonth.getMonth() + 1) {
              return res.status(400).send('backdating month error');
            }
            // check if schedule date is backdated
            if (parseInt(date.getDate()) < checkMonth.getDate()) {
              return res.status(400).send('backdating day error');
            }
            // check if a staff has a scheduled appoint at this time
            const result = await visitorsuite_appointment.findOne({
              where: sequelize.and(
                sequelize.where(
                  sequelize.fn('DATE', sequelize.col('day_of_appoint')),
                  '=',
                  formatDate(date)
                ),
                { time_of_appoint: data.time },
                { company: payload.company },
                { staff_id: payload.staff }
              )
            });
            if (result) {
              return res.status(400).send('I am not available at this time');
            } else {
              // craeate appointment
              const appointmemt = await visitorsuite_appointment.create({
                id: null,
                appointment_id: randomstring.generate(6),
                day_of_appoint: data.day,
                time_of_appoint: data.time,
                staff_id: payload.staff,
                is_active: 1,
                company: payload.company,
                location: staff.location,
                workspace_company: staff.workspace_company,
                estate_house: staff.estate_house,
                apointee_name: data.name,
                apointee_email: data.email,
                phone_number: data.phone_number,
                acknowledge: 0,
                purpose: data.purpose,
                attended: 0,
                type: 'user',
                uid: randomstring.generate(6),
                body: JSON.stringify(data)
              });
              let token = `${baseUrl}/api/v1/visitor/acknowledge/scheduled-appointment/${
                appointmemt.id
              }`;
              const bitly = await settingsController.init(token);
              const host = await VisitorController.visitorSuiteMessageOption(staff.id);

              // notify staff about the schedule
              const msg = `${data.name} has scheduled a visit with you. Visit ${
                bitly.url
              } to find out more`;
              if (host.msg_option === 0) {
                await settingsController.sendEmailMessage(host.email, 'New Visit Schedule', msg);
              } else {
                const hostPhone = await visitorsuite_phone.findOne({
                  where: { user: host.id }
                });
                if (hostPhone) {
                  await settingsController.sendSMSMessage(hostPhone.phone_number, msg);
                }
              }
              return res.status(200).json({
                status: 'success',
                message: 'Visit scheduled successfully'
              });
            }
          } else {
            return res.status(400).send('Appointment date is required');
          }
        } else {
          return res.status(400).send('Broken link');
        }
      } else {
        return res.status(404).send('Broken link');
      }
    } catch (err) {
      return res.status(404).send('internal server error');
    }
  },
  /**
   * Endpoint when a visitor clicks on a staff invite schedule link.
   * redirects to visit pre-reg page
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/send-me-an-appointment/:who’
   */
  aClientScheduled(req, res) {
    const { who } = req.params; //jwt
    try {
      const payload = jwty.decode(who, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };

      if (doesHaveKey(`staff`) && doesHaveKey(`company`)) {
        visitorsuite.findOne({
          where: {
            id: payload.staff
          }
        }).then(staff => {
          if (staff) return res.redirect(`${baseUrl}/visitor-schedule?token=${who}`);
          return res.status(400).send('Broken link');
        });
      } else {
        return res.status(404).send('Broken link');
      }
    } catch (err) {
      return res.status(404).send('Broken link');
    }
  },
  /**
   * Get form fields when a visitor wants to schedule a visit
   * with staff invite link
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/schedule/formdata/:who/:purpose’
   */
  async getScheduleFormData(req, res) {
    // jwt and visit purpose
    const { who, purpose } = req.params;
    try {
      const payload = jwty.decode(who, secretKey);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };

      if (doesHaveKey(`staff`) && doesHaveKey(`company`)) {
        const staff = await visitorsuite.findOne({ where: { id: payload.staff } });

        req.user = staff;
        req.params.visit_type = purpose;
        VisitorController.getFormfields(req, res);
      } else {
        res.status(400).send('Broken link');
      }
    } catch (err) {
      res.status(500).send('Internal Server error');
    }
  },
  clientScheduledAppointments(req, res) {
    visitorsuite_appointment.findAll({
      where: {
        staff_id: req.user.id,
        company: req.user.company,
        location: req.user.location,
        type: 'user'
      }
    }).then(result => {
      if (result.length > 0) {
        return res.status(200).json({
          status: 'success',
          daa: result
        });
      }
      return res.status(200).send('No record found');
    });
  },
  clientScheduledAppointment(req, res) {
    const { id } = req.params;
    visitorsuite_appointment.findOne({
      where: {
        id,
        staff_id: req.user.id,
        company: req.user.company,
        type: 'user'
      }
    }).then(result => {
      if (result) {
        return res.status(200).json({
          status: 'success',
          daa: result
        });
      }
      return res.status(200).send('No record found');
    });
  },
  /**
   * End point when a staff clicks on a
   * visitor visit schedule link. redirects to schedule details page
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/acknowledge/scheduled-appointment/:id’
   */
  async viewVisitorSchedule(req, res) {
    const { id } = req.params;
    res.redirect(`${baseUrl}/visit-schedule?id=${id}`);
  },
  /**
   * Get visitor visit schedule details
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/get/scheduled-appointment/:id’
   */
  async getVisitorSchedule(req, res) {
    const { id } = req.params;
    try {
      const appoinment = await visitorsuite_appointment.findOne({
        where: { id },
        attributes: ['id', 'body', 'day_of_appoint', 'time_of_appoint']
      });
      if (appoinment) return res.status(200).send({ data: appoinment });
      return res.status(400).send('appointment could not be found');
    } catch (err) {
      console.log("ksasqwuev", err)
      res.status(500).send('internal server error');
    }
  },
  /**
   * Staff accept/acknowledge visitor schedule
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route PUT: ‘/api/v1/visitor/accept/scheduled-appointment/;id’
   */
  async acknowledgeVisitorSchedule(req, res) {
    const { id } = req.params; // appointment id
    const appoinment = await visitorsuite_appointment.findOne({
      where: {
        id
      }
    });
    if (appoinment) {
      await visitorsuite_appointment.update({ acknowledge: 1 }, { where: { id, type: 'user' } });
      const staff = await VisitorController.visitorSuiteMessageOption(appoinment.staff_id);
      const company = await 	visitorsuite_company.findOne({ where: { id: staff.id } });

      // notify visitor of appointment acknowledgement and send invite id
      const msg = `Your visit schedule with ${staff.first_name} at ${
        company.name
      } has been acknowledged \n Date: ${appoinment.day_of_appoint} \n Time: ${
        appoinment.time_of_appoint
      }hrs \n Invite id: ${appoinment.uid}`;
      if (staff.msg_option == 1) {
        await settingsController.sendSMSMessage(appoinment.phone_number, msg);
        return res.status(200).send({ message: 'visit acknowledged' });
      } else {
        await settingsController.sendEmailMessage(
          appoinment.apointee_email,
          'Visit Acknowledged',
          msg
        );
        return res.status(200).send({ message: 'visit acknowledged' });
      }
    } else {
      return res.status(400).send('Visit already acknowledged');
    }
  },
  /**
   * Staff decline visitor scheduled visit
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route DELETE: ‘/api/v1/visitor/decline/scheduled-appointment/:id’
   */
  async declineVisitorSchedule(req, res) {
    const { id } = req.params; // appointment id
    const appointment = await visitorsuite_appointment.findOne({
      where: {
        id
      }
    });
    if (appointment) {
      await visitorsuite_appointment.destroy({
        where: {
          id
        }
      });
      const staff = await VisitorController.visitorSuiteMessageOption(appointment.staff_id);
      const company = await 	visitorsuite_company.findOne({ where: { id: staff.company } });

      // notify visitor of visit rejection
      const msg = `Your visit schedule with ${staff.first_name} at ${
        company.name
      } was declined. Do reschedule`;
      if (staff.msg_option == 1) {
        await settingsController.sendSMSMessage(appointment.phone_number, msg);
        return res.status(200).send({ message: 'visit declined' });
      } else {
        await settingsController.sendEmailMessage(
          appointment.apointee_email,
          'visit declined',
          msg
        );
        return res.status(200).send({ message: 'visit declined' });
      }
    } else {
      return res.status(400).send('No records found');
    }
  },
  creategroupScheduling(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN'
    ) {
      visitorsuite_company.findOne({
        where: {
          id: req.user.company
        }
      }).then(result => {
        VisitorController.creategroupOfficeScheduling(req, res);
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  creategroupOfficeScheduling(req, res) {
    /*const { errors, isValid } = validateOfficeGroupSchedules(req.body);
    // Check Validation
    if (!isValid) {
      return res.status(400).json(errors);
    }
    const data = req.body;
    const func2 = () => {
      return new Promise((resolve, reject) => {
        const err = {};
        if (data.staff.length > 0) {
          data.staff.forEach(element => {
            const doesKeyExist = key => {
              return Object.prototype.hasOwnProperty.call(element, key) || false;
            };
            if (!doesKeyExist(`id`)) {
              err.key = 'No staff field found';
            }
            for (let i = 0; i < data.staff.length; i++) {
              VisitorSuite.findOne({
                where: {
                  id: data.data[i].id,
                  company: req.user.company,
                  is_active: 1
                }
              }).then(staff => {
                if (!staff) err.staff = 'No valid staff field';
                if (i == data.staff.length - 1) {
                  resolve(err);
                }
              });
            }
          });
        } else {
          err.staff = 'No staff added';
          resolve(err);
        }
      });
    };
    const func = () => {
      return new Promise((resolve, reject) => {
        const err = {};
        const checkCustomFields = () => {
          if (data.custom.length > 0) {
            data.custom.forEach(element => {
              const doesKeyExist = key => {
                return Object.prototype.hasOwnProperty.call(element, key) || false;
              };
              if (!doesKeyExist(`id`)) {
                err.key = 'No custom field found';
              }
            });
            for (let i = 0; i < data.custom.length; i++) {
              CompanyCustomField.findOne({
                where: {
                  id: data.custom[i].id,
                  company: req.user.company,
                  is_active: 1
                }
              }).then(custom => {
                if (!custom) err.custom = 'No valid custom field';
                if (i == data.custom.length - 1) {
                  resolve(err);
                }
              });
            }
          }
        };
        if (data.purpose.type == 'custom') {
          CustomVisitingPurposes.findOne({
            where: {
              id: data.purpose.id,
              company: req.user.company
            }
          }).then(result => {
            if (!result) {
              err.purpose = 'Invalid purpose';
            }
            checkCustomFields();
          });
        } else {
          if (
            !(
              data.purpose.id == 'Appointment' ||
              data.purpose.id == 'Client' ||
              data.purpose.id == 'Interview' ||
              data.purpose.id == 'Others'
            )
          ) {
            err.purpose = 'Invalid purpose';
          }
          checkCustomFields();
        }
      });
    };
    func2().then(err => {
      if (!isEmpty(err)) {
        return res.status(400).json(err);
      }
      func().then(err => {
        if (!isEmpty(err)) {
          return res.status(400).json(err);
        } else {
          visitorsuite_group_schedules.create({
            id: null,
            day_of_appoint: data.date,
            is_active: 1,
            company: req.user.company,
            phone_number: data.phone_number,
            body: req.body,
            uid: shortid.generate()
          }).then(result => {
            return res.status(200).json({
              status: 'success',
              data: result
            });
          });
        }
      });
    });*/
  },
  /**
   * Export to csv file expected visitors list for
   * current day
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/export’
   */
  async exportTodaysInvites(req, res) {
    try {
      const { user } = req.query; // current user id
      if (user) {
        const staff = await visitorsuite.findOne({
          where: {
            id: user
          }
        });
        if (staff) {
          const today = new Date();
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

          const invites = await visitorsuite_appointment.findAll({
            where: {
              where: sequelize.and(
                sequelize.where(
                  sequelize.fn('DATE', sequelize.col('day_of_appoint')),
                  '=',
                  `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
                ),
                { company: staff.company },
                { location: staff.location },
                { leaving_date: null }
              )
            },
            attributes: [
              'apointee_name',
              'apointee_email',
              'phone_number',
              'day_of_appoint',
              'time_of_appoint',
              'uid'
            ]
          });
          if (!invites.length) return res.status(404).send('No invites for today');
          const fields = [
            'apointee_name',
            'apointee_email',
            'phone_number',
            'day_of_appoint',
            'time_of_appoint',
            'uid'
          ];

          csv = parse(invites, { fields });
          fs.writeFile(filePath, csv, function(err) {
            if (err) {
              return res.status(500).json('internal server error');
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
              res.download(filePath, 'invites.csv');
            }
          });
        } else return res.status(400).send('Bad request');
      } else return res.status(400).send('Bad request');
    } catch (err) {
      console.log("sksiqwlkqx",err);
      return res.status(400).send('Internal server error');
      
    }
  },
  viewAllGroupScheduling(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN'
    ) {
      visitorsuite_group_schedules.findAll({
        where: {
          company: req.user.company
        }
      }).then(result => {
        if (result.length > 0) {
          res.status(400).json({
            status: 'error',
            data: result
          });
        } else {
          return res.status(400).json({
            status: 'error',
            data: 'No record found'
          });
        }
      });
    } else {
      return res.status(400).json({
        status: 'error',
        data: 'Access denied'
      });
    }
  },
  cancelAllAppointmentWithOneClick(req, res) {
    const formatDate = () => {
      let d = new Date(Date.now()),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return [year, month, day].join('-');
    };
    visitorsuite_appointment.findAll({
      where: sequelize.and(
        sequelize.where(sequelize.fn('DATE', sequelize.col('day_of_appoint')), '>=', formatDate()),
        { company: req.user.company },
        { staff_id: req.user.id }
      )
    }).then(result => {
      if (result.length > 0) {
        result.map(element => {
          const msg = `${req.user.first_name} && ${
            req.user.last_name
          } has cancelled appointment with you.`;
          settingsController.sendEmailMessage(element.body.email, `no-reply`, msg).then(() => {
            settingsController.sendSMSMessage(element.phone_number, msg).then(() => {
              visitorsuite_appointment.destroy({
                where: {
                  id: element.id
                }
              }).then(repo => {
                console.log(repo);
              });
            });
          });
        });
        return res.status(200).json({
          status: 'success',
          data: 'All cancelled'
        });
      }
      return res.status(200).json({
        status: 'success',
        data: 'No appoinment'
      });
    });
  },
  viewDailyAppointmentAndReceiveAlert() {
    const formatDate = () => {
      let d = new Date(Date.now()),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return [year, month, day].join('-');
    };
    const ifAppointment = new Promise((resolve, reject) => {
      visitorsuite_appointment.findAll({
        where: sequelize.where(
          sequelize.fn('DATE', sequelize.col('day_of_appoint')),
          '=',
          formatDate()
        )
      }).then(result => {
        if (result.length > 0) {
          resolve(result);
        } else {
          reject();
        }
      });
    });
    const ifGroupScheduled = new Promise((resolve, reject) => {
      visitorsuite_group_schedules.findAll({
        where: sequelize.where(
          sequelize.fn('DATE', sequelize.col('day_of_appoint')),
          '=',
          formatDate()
        )
      }).then(result => {
        if (result.length > 0) {
          resolve(result);
        } else {
          reject();
        }
      });
    });
  },

  //Only parent users
  getAllAppointment(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'SECURITY_ADMIN'
    ) {
      visitorsuite_appointment.findAll({
        where: {
          company: req.user.company
        }
      }).then(result => {
        if (result.length > 0) {
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
        return res.status(200).send('No appointment');
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  getAllActiveAppointment(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'SECURITY_ADMIN'
    ) {
      visitorsuite_appointment.findAll({
        where: {
          is_active: 1,
          company: req.user.company
        }
      }).then(result => {
        if (result.length > 0) {
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
        return res.status(200).send('No appointment');
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  getStaffActiveAppointments(req, res) {
    const { id } = req.params;
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'SECURITY_ADMIN'
    ) {
      visitorsuite_appointment.findAll({
        where: {
          is_active: 1,
          company: req.user.company,
          staff_id: id
        }
      }).then(result => {
        if (result.length > 0) {
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
        return res.status(200).send('No appointment');
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  getStaffAppointments(req, res) {
    const { id } = req.params;
    if (req.user.role == 'GLOBAL_ADMIN') {
      visitorsuite_appointment.findAll({
        where: {
          company: req.user.company,
          staff_id: id
        }
      }).then(result => {
        if (result.length > 0) {
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
        return res.status(200).send('No appointment');
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  /**
   * Get all expected visitors for today
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/get/today-appointment’
   */
  async getAllTodayAppointments(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const offset = page * limit - limit;
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'SECURITY_ADMIN' ||
      req.user.role == 'CARE_TAKER'
    ) {
      const formatDate = () => {
        let d = new Date(Date.now()),
          month = '' + (d.getMonth() + 1),
          day = '' + d.getDate(),
          year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
      };
      const company = await UserControllerClone.getCompany(req, res);

      if (company && company.options === 'office') {
        const result = await visitorsuite_appointment.findAndCountAll({
          attributes: [
            'id',
            'apointee_name',
            'apointee_email',
            'phone_number',
            'purpose',
            'day_of_appoint',
            'time_of_appoint',
            'created_at',
            'attended'
          ],
          include: [
            {
              model: visitorsuite,
              as: 'hostInfo',
              attributes: ['first_name', 'last_name']
            }
          ],
          where: sequelize.and(
            sequelize.where(
              sequelize.fn('DATE', sequelize.col('day_of_appoint')),
              '=',
              formatDate()
            ),
            { company: req.user.company },
            { location: req.user.location }
          ),
          distinct: true,
          offset,
          limit
        });
        return res.status(200).json({
          status: 'success',
          data: result
        });
      } else if (company && company.options === 'workspace') {
        if (
          req.user.role === 'SECURITY_ADMIN' ||
          req.user.role === 'FRONT_DESK_ADMIN' ||
          req.user.workspace_company === null
        ) {
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: sequelize.and(
              sequelize.where(
                sequelize.fn('DATE', sequelize.col('day_of_appoint')),
                '=',
                formatDate()
              ),
              { company: req.user.company },
              { location: req.user.location }
            ),
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        } else {
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: sequelize.and(
              sequelize.where(
                sequelize.fn('DATE', sequelize.col('day_of_appoint')),
                '=',
                formatDate()
              ),
              { company: req.user.company },
              { location: req.user.location },
              { workspace_company: req.user.workspace_company }
            ),
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
      } else if (company && company.options === 'estate') {
        if (
          req.user.role === 'SECURITY_ADMIN' ||
          req.user.role === 'FRONT_DESK_ADMIN' ||
          req.user.role === 'GLOBAL_ADMIN'
        ) {
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: sequelize.and(
              sequelize.where(
                sequelize.fn('DATE', sequelize.col('day_of_appoint')),
                '=',
                formatDate()
              ),
              { company: req.user.company },
              { location: req.user.location }
            ),
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        } else {
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: sequelize.and(
              sequelize.where(
                sequelize.fn('DATE', sequelize.col('day_of_appoint')),
                '=',
                formatDate()
              ),
              { company: req.user.company },
              { location: req.user.location },
              { estate_house: req.user.estate_house }
            ),
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
      } else {
        return res.status(404).send('Other options arae not avavilable yet!');
      }
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  /**
   * Get all invites
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/invites’
   */
  async getAllInvites(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 30;

    const offset = page * limit - limit;
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'SECURITY_ADMIN' ||
      req.user.role == 'CARE_TAKER'
    ) {
      const company = await UserControllerClone.getCompany(req, res);

      if (company && company.options === 'office') {
        const result = await visitorsuite_appointment.findAndCountAll({
          attributes: [
            'id',
            'apointee_name',
            'apointee_email',
            'phone_number',
            'purpose',
            'day_of_appoint',
            'time_of_appoint',
            'created_at',
            'attended'
          ],
          include: [
            {
              model: visitorsuite,
              as: 'hostInfo',
              attributes: ['first_name', 'last_name']
            }
          ],
          where: {
            company: req.user.company,
              location: req.user.location 
          },
          distinct: true,
          offset,
          limit
        });
        console.log(result)
        return res.status(200).json({
          status: 'success',
          data: result
        });
      } else if (company && company.options === 'workspace') {
        if (
          req.user.role === 'SECURITY_ADMIN' ||
          req.user.role === 'FRONT_DESK_ADMIN' ||
          req.user.workspace_company === null
        ) {
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: {
              company: req.user.company,
                location: req.user.location
            },
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        } else {
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: 
              
              { company: req.user.company ,
              location: req.user.location ,
              workspace_company: req.user.workspace_company },
            
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
      } else if (company && company.options === 'estate') {
        if (
          req.user.role === 'SECURITY_ADMIN' ||
          req.user.role === 'FRONT_DESK_ADMIN' ||
          req.user.role === 'GLOBAL_ADMIN'
        ) {
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: {
              company: req.user.company,
                location: req.user.location 
            },
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        } else {
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: 
              { company: req.user.company ,
              location: req.user.location ,
              estate_house: req.user.estate_house },
            
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
      } else {
        return res.status(404).send('Other options arae not avavilable yet!');
      }
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  /**
   * Get all appointment by date
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   */
  async getAllAppointmentByDate(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'CARE_TAKER'
    ) {
      const data = req.body;
      const formatDate = date => {
        let d = new Date(date),
          month = '' + (d.getMonth() + 1),
          day = '' + d.getDate(),
          year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
      };
      const doesKeyExist = key => {
        return Object.prototype.hasOwnProperty.call(data, key) || false;
      };

      if (doesKeyExist(`date`)) {
        const company = await UserControllerClone.getCompany(req, res);
        if (company && company.options === 'office') {
          const result = await visitorsuite_appointment.findAll({
            where: sequelize.and(
              sequelize.where(
                sequelize.fn('DATE', sequelize.col('day_of_appoint')),
                '=',
                formatDate(data.date)
              ),
              { company: req.user.company },
              { location: req.user.location }
            )
          });
          if (result.length > 0) {
            result = result.map(element => {
              element.body = JSON.parse(element.body);
              return element;
            });
            return res.status(200).json({
              status: 'success',
              data: result
            });
          }
          return res.status(200).send('No appointment found');
        } else if (company && company.options === 'workspace') {
          let companyConditions = [
            { company: req.user.company },
            { location: req.user.location },
            { workspace_company: req.user.workspace_company }
          ];
          if (!req.user.workspace_company) {
            companyConditions = [{ company: req.user.company }, { location: req.user.location }];
          }
          const result = await visitorsuite_appointment.findAll({
            where: sequelize.and(
              sequelize.where(
                sequelize.fn('DATE', sequelize.col('day_of_appoint')),
                '=',
                formatDate(data.date)
              ),
              ...companyConditions
            )
          });
          if (result.length > 0) {
            result = result.map(element => {
              element.body = JSON.parse(element.body);
              return element;
            });
            return res.status(200).json({
              status: 'success',
              data: result
            });
          }
          return res.status(200).send('No appointment found');
        } else if (company && company.options === 'estate') {
          let companyConditions = [
            { company: req.user.company },
            { location: req.user.location },
            { estate_house: req.user.estate_house }
          ];
          if (req.user.role === 'GLOBAL_ADMIN') {
            companyConditions = [{ company: req.user.company }, { location: req.user.location }];
          }
          const result = await visitorsuite_appointment.findAll({
            where: sequelize.and(
              sequelize.where(
                sequelize.fn('DATE', sequelize.col('day_of_appoint')),
                '=',
                formatDate(data.date)
              ),
              ...companyConditions
            )
          });
          if (result.length > 0) {
            result = result.map(element => {
              element.body = JSON.parse(element.body);
              return element;
            });
            return res.status(200).json({
              status: 'success',
              data: result
            });
          }
          return res.status(200).send('No appointment found');
        } else return res.status(404).send('this option is not available yet');
      } else {
        return res.status(400).send('Add date');
      }
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  /**
   * Get last 7 days invites
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/get/week-ago-appointment’
   */
  async getLast7DaysAppointments(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const offset = page * limit - limit;
    try {
      if (
        req.user.role == 'GLOBAL_ADMIN' ||
        req.user.role == 'LOCATION_ADMIN' ||
        req.user.role == 'FRONT_DESK_ADMIN' ||
        req.user.role == 'CARE_TAKER'
      ) {
        let now = new Date(); //.setHours(00, 00, 00);

        //Change it so that it is 7 days in the past.
        var pastDate = now.getDate() - 7;
        now.setDate(pastDate);
        let dateTo = new Date();
        let toDate = new Date(
          `${dateTo.getMonth() + 1}/${dateTo.getDate()}/${dateTo.getFullYear()}`
        );
        const date = new Date(`${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`);

        const company = await UserControllerClone.getCompany(req, res);
        if (company && company.options === 'office') {
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: {
              day_of_appoint: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location
            },
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        } else if (company && company.options === 'workspace') {
          let conditions = {
            day_of_appoint: {
              $between: [date, toDate]
            },
            company: req.user.company,
            location: req.user.location,
            workspace_company: req.user.workspace_company
          };
          if (!req.user.workspace_company) {
            conditions = {
              day_of_appoint: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location
            };
          }
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: conditions,
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        } else if (company && company.options === 'estate') {
          let conditions = {
            day_of_appoint: {
              $between: [date, toDate]
            },
            company: req.user.company,
            location: req.user.location,
            estate_house: req.user.estate_house
          };
          if (req.user.role === 'GLOBAL_ADMIN') {
            conditions = {
              day_of_appoint: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location
            };
          }
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: conditions,
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        } else return res.status(404).send('Other options are not available yet!');
      } else {
        res.status(401).send('Access Denied!');
      }
    } catch (err) {
      console.log("jjsaiqqwqlkwq",err);
      res.status(500).send('Server error!');
    }
  },
  /**
   * Get appointment by date range
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/get/date-range-appointment’
   */
  async getDateRangeAppointments(req, res) {
    let { page, limit, from, to } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;
    console.log(from, to);
    const offset = page * limit - limit;
    try {
      if (
        req.user.role == 'GLOBAL_ADMIN' ||
        req.user.role == 'LOCATION_ADMIN' ||
        req.user.role == 'FRONT_DESK_ADMIN' ||
        req.user.role == 'CARE_TAKER'
      ) {
        let dateFrom = new Date(from); //.setHours(00, 00, 00);

        let dateTo = new Date(to);
        let toDate = new Date(
          `$${dateTo.getMonth() + 1}/$${dateTo.getDate()}/$${dateTo.getFullYear()}`
        );
        const date = new Date(
          `$${dateFrom.getMonth() + 1}/$${dateFrom.getDate()}/$${dateFrom.getFullYear()}`
        );
        const company = await UserControllerClone.getCompany(req, res);

        if (company && company.options === 'office') {
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: {
              day_of_appoint: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location
            },
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        } else if (company && company.options === 'workspace') {
          let conditions = {
            day_of_appoint: {
              $between: [date, toDate]
            },
            company: req.user.company,
            location: req.user.location,
            workspace_company: req.user.workspace_company
          };
          if (!req.user.workspace_company) {
            conditions = {
              day_of_appoint: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location
            };
          }
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: conditions,
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        } else if (company && company.options === 'estate') {
          let conditions = {
            day_of_appoint: {
              $between: [date, toDate]
            },
            company: req.user.company,
            location: req.user.location,
            estate_house: req.user.estate_house
          };
          if (req.user.role === 'GLOBAL_ADMIN') {
            conditions = {
              day_of_appoint: {
                $between: [date, toDate]
              },
              company: req.user.company,
              location: req.user.location
            };
          }
          const result = await visitorsuite_appointment.findAndCountAll({
            attributes: [
              'id',
              'apointee_name',
              'apointee_email',
              'phone_number',
              'purpose',
              'day_of_appoint',
              'time_of_appoint',
              'created_at',
              'attended'
            ],
            include: [
              {
                model: visitorsuite,
                as: 'hostInfo',
                attributes: ['first_name', 'last_name']
              }
            ],
            where: conditions,
            distinct: true,
            offset,
            limit
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        } else return res.status(404).send('Other options are not available yet');
      } else {
        res.status(401).send('Access Denied!');
      }
    } catch (err) {
      console.log("ssosijas",err);
      res.status(500).send('Server error!');
    }
  },
  getAllAppointmentByWeek(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN'
    ) {
      Date.prototype.getWeek = () => {
        const onejan = new Date(this.getFullYear(), 0, 1);
        return Math.ceil(((this - onejan) / 86400000 + onejan.getDay() + 1) / 7);
      };
      const data = req.body;
      const formatDate = date => {
        let d = new Date(date);
        return d.getWeek();
      };
      const doesKeyExist = key => {
        return Object.prototype.hasOwnProperty.call(data, key) || false;
      };

      if (doesKeyExist(`date`)) {
        visitorsuite_appointment.findAll({
          where: sequelize.and(
            sequelize.where(
              sequelize.fn('WEEK', sequelize.col('day_of_appoint')),
              '=',
              formatDate(data.date)
            ),
            { company: req.user.company }
          )
        }).then(result => {
          if (result.length > 0) {
            result = result.map(element => {
              element.body = JSON.parse(element.body);
              return element;
            });
            return res.status(200).json({
              status: 'success',
              data: result
            });
          }
          return res.status(200).send('No appointment');
        });
      } else {
        return res.status(400).send('Add date');
      }
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  getAllAppointmentByMonth(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN'
    ) {
      const data = req.body;
      const formatDate = date => {
        let d = new Date(date),
          month = '' + (d.getMonth() + 1),
          day = '' + d.getDate(),
          year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return month;
      };
      const doesKeyExist = key => {
        return Object.prototype.hasOwnProperty.call(data, key) || false;
      };

      if (doesKeyExist(`date`)) {
        visitorsuite_appointment.findAll({
          where: sequelize.and(
            sequelize.where(
              sequelize.fn('MONTH', sequelize.col('day_of_appoint')),
              '=',
              formatDate(data.date)
            ),
            { company: req.user.company }
          )
        }).then(result => {
          if (result.length > 0) {
            result = result.map(element => {
              element.body = JSON.parse(element.body);
              return element;
            });
            return res.status(200).json({
              status: 'success',
              data: result
            });
          }
          return res.status(200).send('No appointment');
        });
      } else {
        return res.status(400).send('Add date');
      }
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  getPastNotAcknowledgeAppointments(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'SECURITY_ADMIN'
    ) {
      const formatDate = () => {
        let d = new Date(Date.now()),
          month = '' + (d.getMonth() + 1),
          day = '' + d.getDate(),
          year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
      };
      visitorsuite_appointment.findAll({
        where: sequelize.and(
          sequelize.where(
            sequelize.fn('DATE', sequelize.col('day_of_appoint')),
            '<=',
            formatDate()
          ),
          { company: req.user.company },
          { acknowledge: 0 }
        )
      }).then(result => {
        if (result.length > 0) {
          result = result.map(element => {
            element.body = JSON.parse(element.body);
            return element;
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
        return res.status(200).send('No appointment');
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  //By all users
  showActiveAppointment(req, res) {
    visitorsuite_appointment.findAll({
      where: {
        staff_id: req.user.id,
        is_active: 1
      }
    }).then(result => {
      if (result.length > 0) {
        return res.status(200).json({
          status: 'success',
          data: result
        });
      }
      return res.status(200).send('No appointment');
    });
  },
  showAllAppointment(req, res) {
    visitorsuite_appointment.findAll({
      where: {
        staff_id: req.user.id
      }
    }).then(result => {
      if (result.length > 0) {
        return res.status(200).json({
          status: 'success',
          data: result
        });
      }
      return res.status(200).send('No appointment');
    });
  },
  showAppointmentsByToday(req, res) {
    const formatDate = () => {
      let d = new Date(Date.now()),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return [year, month, day].join('-');
    };
    visitorsuite_appointment.findAll({
      where: sequelize.and(
        sequelize.where(sequelize.fn('DATE', sequelize.col('day_of_appoint')), '=', formatDate()),
        { staff_id: req.user.id }
      )
    }).then(result => {
      if (result.length > 0) {
        result = result.map(element => {
          element.body = JSON.parse(element.body);
          return element;
        });
        return res.status(200).json({
          status: 'success',
          data: result
        });
      }
      return res.status(200).send('No appointment');
    });
  },
  showAppointmentsByDate(req, res) {
    const data = req.body;
    const formatDate = date => {
      let d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return [year, month, day].join('-');
    };
    const doesKeyExist = key => {
      return Object.prototype.hasOwnProperty.call(data, key) || false;
    };

    if (doesKeyExist(`date`)) {
      visitorsuite_appointment.findAll({
        where: sequelize.and(
          sequelize.where(
            sequelize.fn('DATE', sequelize.col('day_of_appoint')),
            '=',
            formatDate(data.date)
          ),
          { staff_id: req.user.id }
        )
      }).then(result => {
        if (result.length > 0) {
          result = result.map(element => {
            element.body = JSON.parse(element.body);
            return element;
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
        return res.status(200).send('No appointment');
      });
    } else {
      return res.status(400).send('Add date');
    }
  },
  showAppointmentsByWeek(req, res) {
    Date.prototype.getWeek = () => {
      const onejan = new Date(this.getFullYear(), 0, 1);
      return Math.ceil(((this - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    };
    const data = req.body;
    const formatDate = date => {
      let d = new Date(date);
      return d.getWeek();
    };
    const doesKeyExist = key => {
      return Object.prototype.hasOwnProperty.call(data, key) || false;
    };

    if (doesKeyExist(`date`)) {
      visitorsuite_appointment.findAll({
        where: sequelize.and(
          sequelize.where(
            sequelize.fn('WEEK', sequelize.col('day_of_appoint')),
            '=',
            formatDate(data.date)
          ),
          { staff_id: req.user.id }
        )
      }).then(result => {
        if (result.length > 0) {
          result = result.map(element => {
            element.body = JSON.parse(element.body);
            return element;
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
        return res.status(200).send('No appointment');
      });
    } else {
      return res.status(400).send('Add date');
    }
  },
  showAppointmentsByMonth(req, res) {
    const data = req.body;
    const formatDate = date => {
      let d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return month;
    };
    const doesKeyExist = key => {
      return Object.prototype.hasOwnProperty.call(data, key) || false;
    };

    if (doesKeyExist(`date`)) {
      visitorsuite_appointment.findAll({
        where: sequelize.and(
          sequelize.where(
            sequelize.fn('MONTH', sequelize.col('day_of_appoint')),
            '=',
            formatDate(data.date)
          ),
          { staff_id: req.user.id }
        )
      }).then(result => {
        if (result.length > 0) {
          result = result.map(element => {
            element.body = JSON.parse(element.body);
            return element;
          });
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
        return res.status(200).send('No appointment');
      });
    } else {
      return res.status(400).send('Add date');
    }
  },
  showPastNotAcknowledgedAppointments(req, res) {
    const formatDate = () => {
      let d = new Date(Date.now()),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return [year, month, day].join('-');
    };
    visitorsuite_appointment.findAll({
      where: sequelize.and(
        sequelize.where(sequelize.fn('DATE', sequelize.col('day_of_appoint')), '<=', formatDate()),
        { staff_id: req.user.id },
        { acknowledge: 0 }
      )
    }).then(result => {
      if (result.length > 0) {
        result = result.map(element => {
          element.body = JSON.parse(element.body);
          return element;
        });
        return res.status(200).json({
          status: 'success',
          data: result
        });
      }
      return res.status(200).send('No appointment');
    });
  },
  /**
   * Invited visitors sign in or office checkin
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/attend/appointment/:id’
   */
  async attendAppointment(req, res) {
    const { id } = req.params; // invite id
    const formatDate = () => {
      let d = new Date(Date.now()),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return [year, month, day].join('-');
    };
    // check if user has appointment
    const result = await visitorsuite_appointment.findOne({
      where: sequelize.and(
        sequelize.where(sequelize.fn('DATE', sequelize.col('day_of_appoint')), '=', formatDate()),
        { uid: id },
        { attended: 0 }
      )
    });
    if (result) {
      // mark appointment as attended
      await visitorsuite_appointment.update({ attended: 1 }, { where: { id: result.id } });
      // get visitor preregistered details
      const data = JSON.parse(result.body);

      let host = null;
      let defaultStaff = null;

      // if user has no host, use companies default host
      if (!result.staff_id) {
        const defaultHost = await default_host.findOne({
          where: {
            company: result.company,
            location: result.location,
            workspace_company: result.workspace_company,
            estate_house: result.estate_house
          }
        });
        if (defaultHost) {
          host = defaultHost.staff_id;
          defaultStaff = defaultHost.staff_id;
        }
      } else {
        host = result.staff_id;
      }
      // create visitor record
      const visitor = await visitors.create({
        id: null,
        visiting_date: Date.now(),
        company: result.company,
        location: result.location,
        workspace_company: result.workspace_company,
        estate_house: result.estate_house,
        short_id: id,
        staff: host
      });
      // add field values record
      for (const field in data) {
        if (field !== 'day_of_appoint' && field !== 'time_of_appoint') {
          await visitor_field.create({
            field_name: field,
            field_value: data[field],
            visitor: visitor.id,
            company: result.company,
            location: result.location
          });
        }
      }
      // send visitor welcome message
      visitorEvents.default.emit('sendWelcomeMessage', data, visitor);
      if (result.staff_id) {
        const staff = await VisitorController.visitorSuiteMessageOption(result.staff_id);

        const payload = {
          staff_id: staff.id,
          id: visitor.id,
          short_id: visitor.short_id,
          company: visitor.company,
          workspace_company: visitor.workspace_company,
          estate_house: visitor.estate_house
        };
        let token = jwty.encode(payload, secretKey);
        token = `${baseUrl}/api/v1/visitor/action/${token}`;
        const { url } = await settingsController.init(token);

        // notify staff of visit
        visitorEvents.default.emit('staffNotification', staff, data.name, '', data.purpose, url);
      } else {
        // notified defult host
        const payload = {
          staff_id: host,
          id: visitor.id,
          short_id: visitor.short_id,
          company: visitor.company,
          workspace_company: visitor.workspace_company,
          estate_house: visitor.estate_house
        };
        let token = jwty.encode(payload, secretKey);
        token = `${baseUrl}/api/v1/visitor/action/${token}`;
        const { url } = await settingsController.init(token);

        if (defaultStaff)
          visitorEvents.default.emit(
            'notifyDefaultHost',
            req.user.company,
            data.name,
            '',
            data.purpose,
            url,
            visitor.workspace_company,
            visitor.estate_house,
            req.user.location
          );
      }
      let isPhoto_required = false;
      // get configuration for this visit type
      const visitTypeConfig = await visit_types_config.findOne({
        where: {
          company: result.company,
          location: result.location,
          visit_type: data.purpose
        }
      });
      // get general config
      const configs = await company_configurations.findOne({
        where: {
          company: result.company,
          location: result.location
        }
      });

      if (visitTypeConfig) {
        isPhoto_required = visitTypeConfig.isPhoto_required;
      } else {
        // use general config instead
        isPhoto_required = configs.isPhoto_required;
      }

      return res.status(200).json({
        status: 'success',
        name: data.name,
        purpose: data.purpose,
        data: visitor,
        isPhoto_required
      });
    } else {
      return res.status(400).send('You have no visit schedule for today');
    }
  },
  editAttendAppointmentPicture(req, res) {
    const { id } = req.params;
    const doesHaveKey = key => {
      return Object.prototype.hasOwnProperty.call(req.body, key) || false;
    };
    if (doesHaveKey(`avatar`)) {
      visitorsuite_default_field.update(
        { avatar },
        { where: { id, company: req.user.company } }
      ).then(() => {
        return res.status(200).send('Done');
      });
    } else {
      return res.status(200).send('No avatar');
    }
  },
  viewAttendedAppointment(req, res) {
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'SECURITY_ADMIN'
    ) {
      visitorsuite_appointment.findAll({
        where: {
          attended: 1
        }
      }).then(result => {
        if (result.length > 0) {
          return res.status(200).json({
            status: 'success',
            data: result
          });
        }
        return res.status(200).send('No attended apppointment');
      });
    } else {
      return res.status(400).send('Access denied!');
    }
  },
  viewAcknowledgedAppointments(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const offset = page * limit - limit;
    if (
      req.user.role == 'GLOBAL_ADMIN' ||
      req.user.role == 'LOCATION_ADMIN' ||
      req.user.role == 'FRONT_DESK_ADMIN' ||
      req.user.role == 'SECURITY_ADMIN'
    ) {
      visitorsuite_appointment.findAndCountAll({
        where: {
          attended: 0,
          acknowledge: 1
        },
        include: [
          {
            model: visitorsuite,
            as: 'staff',
            attributes: ['first_name', 'last_name']
          }
        ],
        offset,
        limit
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
   * Search for an appointment
   * @param {object} req req obj
   * @param {object} res res obj
   * @returns json object
   * @Route GET: ‘/api/v1/visitor/appointment/search/:search’
   */
  searchAppointments(req, res) {
    const { search } = req.params;
    const limit = 10;
    const offset = 0;
    const sanitizedSearch = search
      .trim()
      .toLowerCase()
      .replace(/[\W_]+/, '');
    try {
      visitorsuite_appointment.findAndCountAll({
        attributes: [
          'id',
          'apointee_name',
          'apointee_email',
          'phone_number',
          'purpose',
          'day_of_appoint',
          'time_of_appoint',
          'created_at'
        ],
        include: [
          {
            model: visitorsuite,
            as: 'hostInfo',
            attributes: ['first_name', 'last_name']
          }
        ],
        where: {
          [Op.or]: sequelize.where(
            sequelize.fn('lower', sequelize.col('purpose')),
            'LIKE',
            `%${sanitizedSearch}%`
          ),
          [Op.or]: sequelize.where(
            sequelize.fn('lower', sequelize.col('apointee_name')),
            'LIKE',
            `%${sanitizedSearch}%`
          ),
          location: req.user.location,
          company: req.user.company
        },
        offset,
        limit
      }).then(data => {
        return res.status(200).send({ data });
      });
    } catch (err) {
      console.log("naaqnsuia",err);
      res.status(500).send(err);
    }
  },
  showUserAttendedAppointment(req, res) {
    visitorsuite_appointment.findAll({
      where: {
        attended: 1,
        staff_id: req.user.id
      }
    }).then(result => {
      if (result.length > 0) {
        return res.status(200).json({
          status: 'success',
          data: result
        });
      }
      return res.status(200).send('No attended apppointment');
    });
  },
  cancelAppointment(req, res) {
    const { id } = req.params;
    visitorsuite_appointment.findOne({
      where: {
        id,
        attended: 0,
        staff_id: req.user.id
      }
    }).then(result => {
      if (result) {
        visitorsuite_appointment.destroy({
          where: { id: result.id }
        }).then(() => {
          return res.status(200).send('Appointment cancelled');
        });
      } else {
        return res.status(200).send('No appointment found');
      }
    });
  }
};

module.exports = VisitorController;
