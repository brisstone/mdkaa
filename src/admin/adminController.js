const model = require('../models');
const bcrypt = require('bcryptjs');
const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken');
const validatePlanInputs = require('../validation/plan');
const keys = require('../config/keys');
const jwty = require('jwt-simple');
const settingsController = require('../controllers/settingsController');

const Op = Sequelize.Op;
const {
  VisitorSuiteCompany,
  VisitorSuiteCompanyPlan,
  VisitorSuite,
  VisitorSuitePhone,
  CompanyBilling,
  VisitorSuitePlans,
  VisitorSuiteLocation,
  AdminLogin
} = model;

const adminController = {


  async getAllCompanies(req, res) {
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 30;

    const offset = page * limit - limit;
    try {
      const companies = await VisitorSuiteCompany.findAndCountAll({
        include: [
          {
            model: VisitorSuite,
            as: 'users',
            where: {
              role: 'GLOBAL_ADMIN'
            },
            attributes: ['id', 'last_seen']
          }
        ],
        offset,
        limit
      });
      res.status(200).send({ data: companies });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async getCompaniesByOption(req, res) {
    const { option } = req.params;
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 30;

    const offset = page * limit - limit;
    try {
      const companies = await VisitorSuiteCompany.findAndCountAll({
        where: {
          options: option
        },
        include: [
          {
            model: VisitorSuite,
            as: 'users',
            where: {
              role: 'GLOBAL_ADMIN'
            },
            attributes: ['id', 'last_seen']
          }
        ],
        offset,
        limit
      });
      res.status(200).send({ data: companies });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async searchCompany(req, res) {
    const { search } = req.params;
    const limit = 20;
    const offset = 0;
    const sanitizedSearch = search
      .trim()
      .toLowerCase()
      .replace(/[\W_]+/, '');
    try {
      const companies = await VisitorSuiteCompany.findAndCountAll({
        where: {
          [Op.or]: Sequelize.where(
            Sequelize.fn('lower', Sequelize.col('name')),
            'LIKE',
            `%${sanitizedSearch}%`
          )
        },
        include: [
          {
            model: VisitorSuite,
            as: 'users',
            where: {
              role: 'GLOBAL_ADMIN'
            },
            attributes: ['id', 'last_seen']
          }
        ],
        order: [['name', 'ASC']],
        limit,
        offset
      });
      res.status(200).send({ data: companies });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server ');
    }
  },


  async getCompaniesByStatus(req, res) {
    const { status } = req.params;
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const offset = page * limit - limit;
    try {
      const companies = await VisitorSuiteCompany.findAndCountAll({
        where: {
          is_active: status
        },
        include: [
          {
            model: VisitorSuite,
            as: 'users',
            where: {
              role: 'GLOBAL_ADMIN'
            },
            attributes: ['id', 'last_seen']
          }
        ],
        offset,
        limit
      });
      res.status(200).send({ data: companies });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async getCompany(req, res) {
    const { id } = req.params;
    try {
      const companies = await VisitorSuiteCompany.findOne({
        where: {
          id
        }
      });
      res.status(200).send({ data: companies });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async disableCompany(req, res) {
    try {
      const { id } = req.params;
      const company = await VisitorSuiteCompany.findOne({
        where: {
          id
        }
      });
      if (company) {
        await VisitorSuiteCompany.update(
          { is_active: 0 },
          {
            where: {
              id
            }
          }
        );
        res.status(200).send({ message: 'company disabled' });
      } else {
        res.status(404).send('Company not found');
      }
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async enableCompany(req, res) {
    try {
      const { id } = req.params;
      const company = await VisitorSuiteCompany.findOne({
        where: {
          id
        }
      });
      if (company) {
        await VisitorSuiteCompany.update(
          { is_active: 1 },
          {
            where: {
              id
            }
          }
        );
        res.status(200).send({ message: 'company enabled' });
      } else {
        res.status(404).send('Company not found');
      }
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async deleteCompany(req, res) {
    try {
      const { id } = req.params;
      const { email, password } = req.body;

      const admin = await AdminLogin.findOne({ where: { email } });
      // check if user exists
      if (!admin) {
        return res.status(401).send('Invalid email and password combination');
      }
      // Check password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return res.status(401).send('Invalid email and password combination');

      const company = await VisitorSuiteCompany.findOne({
        where: {
          id
        }
      });
      if (company) {
        await VisitorSuiteCompany.destroy({
          where: {
            id
          }
        });
        res.status(200).send({ message: 'company deleted' });
      } else {
        res.status(404).send('Company not found');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  async getCompanyUsers(req, res) {
    const { id } = req.params;
    let { page, limit } = req.query;
    page = Number(page) || 1;
    limit = Number(limit) || 100;

    const offset = page * limit - limit;
    try {
      const users = await VisitorSuite.findAndCountAll({
        where: {
          company: id
        },
        attributes: ['id', 'first_name', 'last_name', 'last_seen', 'date', 'email', 'role'],
        include: [
          {
            model: VisitorSuitePhone,
            as: 'phone',
            attributes: ['id', 'phone_number']
          }
        ],
        offset,
        limit
      });
      res.status(200).send({ data: users });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async getCompanyPlan(req, res) {
    const { id } = req.params;
    console.log('uuuru', id);
    try {
      const plan = await VisitorSuiteCompanyPlan.findOne({
        where: {
          company: id
        },
        attributes: ['id', 'start_date', 'company', 'expiring_date', 'interval_remaining', 'period'],
        include: [
          {
            model: VisitorSuitePlans,
            as: 'planInfo'
          }
        ]
      });
      res.status(200).send({ data: plan });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  /**
   * manually subscribe a company
   * @param {obj} req request object
   * @param {obj} res res object
   * @return json object
   */
  async subscribeCompany(req, res) {
    const { id } = req.params;
    const { start_date, expiring_date, plan, interval_remaining, period } = req.body;
    try {
      let amount = 0;
      const locations = await VisitorSuiteLocation.count({
        where: {
          company: id
        }
      })
      const result = await VisitorSuitePlans.findOne({
        where: {
          id: plan
        }
      });
      if (period === 'month') amount = result.monthly_billing * locations
      if (period === 'year') amount = result.yearly_billing * locations

      // create billing record
      await CompanyBilling.create({
        company: id,
        plan,
        amount,
        period,
        date: Date.now(),
        payment_status: 'paid'
      });
      const previous_plan = await VisitorSuiteCompanyPlan.findOne({ where: { company: id } });
      await VisitorSuiteCompanyPlan.update(
        {
          start_date: new Date(start_date),
          expiring_date: new Date(expiring_date),
          interval_remaining: parseInt(interval_remaining),
          plan,
          period,
          previous_plan: previous_plan.plan
        },
        {
          where: {
            company: id
          }
        }
      );
      return res.status(200).send({ message: 'subscription enabled' });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  /**
   * downgrade a companies plan to Free
   * @param {obj} req req obj
   * @param {obj} res res obj
   * @returns json obj
   */
  async suspendPlan(req, res) {
    const { id } = req.params;
    try {
      const plan = await VisitorSuitePlans.findOne({
        where: {
          plan_name: 'Free'
        }
      });
      if (plan) {
        const previous_plan = await VisitorSuiteCompanyPlan.findOne({ where: { company: id } });
        await VisitorSuiteCompanyPlan.update(
          {
            start_date: Date.now(),
            interval_remaining: 0,
            expiring_date: new Date('0'),
            previous_plan: previous_plan.plan,
            plan: plan.id
          },
          {
            where: {
              id: previous_plan.id
            }
          }
        );
        return res.status(200).send({ message: 'Plan downgraded to Free' });
      }
      return res.status(400).send('plan not found');
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  /**
   *
   * returns a companies billing history
   * @param {obj} req req obj
   * @param {*} res res obj
   * @returns json obj
   */
  async getCompanyBillings(req, res) {
    const { id } = req.params;
    try {
      const billings = await CompanyBilling.findAll({
        where: {
          company: id
        },
        include: [
          {
            model: VisitorSuitePlans,
            as: 'billingPlan',
            attributes: ['id', 'plan_name']
          }
        ]
      });
      res.status(200).send({ data: billings });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  async getCompanyLocations(req, res) {
    const { id } = req.params;
    try {
      const locations = await VisitorSuiteLocation.count({
        where: {
          company: id
        }
      });
      res.status(200).send({ data: locations });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  async getPlans(req, res) {
    try {
      const plans = await VisitorSuitePlans.findAll();
      res.status(200).send({ data: plans });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async getActivePlans(req, res) {
    try {
      const plans = await VisitorSuitePlans.findAll({
        where: {
          is_active: 1
        }
      });
      res.status(200).send({ data: plans });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async addPlan(req, res) {
    const { errors } = validatePlanInputs(req.body);
    // Check Validation
    if (errors.length) {
      return res.status(400).json(errors[0]);
    }
    try {
      const planExist = await VisitorSuitePlans.findOne({
        where: {
          plan_name: req.body.plan_name
        }
      });
      console.log(planExist);
      if (planExist) return res.status(400).send('Plan name already exist, try a new name');
      const plan = await VisitorSuitePlans.create({
        ...req.body,
        is_active: 1
      });
      return res.status(201).send({ data: plan, message: 'Plan added successfully!' });
    } catch (err) {
      res.status(500).send(err.message);
    }
  },


  async edit(req, res) {
    const { errors } = validatePlanInputs(req.body);
    const { id } = req.params;
    // Check Validation
    if (errors.length) {
      return res.status(400).json(errors[0]);
    }
    try {
      await VisitorSuitePlans.update(
        {
          ...req.body
        },
        {
          where: {
            id
          }
        }
      );
      return res.status(201).send({ status: 'success', message: 'Plan edited successfully!' });
    } catch (err) {
      res.status(500).send(err.message);
    }
  },


  async disablePlan(req, res) {
    try {
      const { id } = req.params;
      const plan = await VisitorSuitePlans.findOne({
        where: {
          id
        }
      });
      if (plan) {
        await VisitorSuitePlans.update(
          { is_active: 0 },
          {
            where: {
              id
            }
          }
        );
        res.status(200).send({ message: 'plan disabled' });
      } else {
        res.status(404).send('plan not found');
      }
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async enablePlan(req, res) {
    try {
      const { id } = req.params;
      const plan = await VisitorSuitePlans.findOne({
        where: {
          id
        }
      });
      if (plan) {
        await VisitorSuitePlans.update(
          { is_active: 1 },
          {
            where: {
              id
            }
          }
        );
        res.status(200).send({ message: 'plan enabled' });
      } else {
        res.status(404).send('plan not found');
      }
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async adminLogin(req, res) {
    const { email, password } = req.body;
    if (!email && !password) return res.status(400).send('email and password is required');
    try {
      // Find user by email
      // eslint-disable-next-line consistent-return
      const admin = await AdminLogin.findOne({ where: { email } });
      // check if user exists
      if (!admin) {
        return res.status(401).send('Invalid email and password combination');
      }
      // Check password
      const isMatch = await bcrypt.compare(password, admin.password);

      if (isMatch) {
        console.log(isMatch, password);
        const payload = { id: admin.id, name: admin.name, email: admin.email };
        jwt.sign(payload, keys.adminSecret, { expiresIn: '1h' }, (err, token) => {
          return res.status(200).send({
            success: true,
            token: `Bearer ${token}`
          });
        });
      } else {
        return res.status(401).send('Invalid email and password combination');
      }
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async addAdmin(req, res) {
    const { name, email, password } = req.body;
    const passStrength = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!name && !email && !password) return res.status(400).send('All fields are required');
    if (!passStrength.test(password))
      return res
        .status(400)
        .send('password must be minimum of eight characters, at least one letter and one number');
    try {
      const admin = await AdminLogin.findOne({
        where: { email }
      });
      if (admin) return res.status(400).send('This email can not be registered');
      const hashedPassword = bcrypt.hashSync(password, 8);
      await AdminLogin.create({
        name,
        email,
        password: hashedPassword,
        others: ''
      });
      res.status(201).send({ message: 'new admin added' });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },


  async deleteAdmin(req, res) {
    const { id } = req.params;
    try {
      const admin = AdminLogin.findOne({
        where: {
          id
        }
      });
      if (admin) {
        await AdminLogin.destroy({
          where: {
            id
          }
        });
        res.status(200).send({ message: 'admin removed' });
      }
      res.status(400).send('admin does not exist');
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  async getAdmins(req, res) {
    try {
      const admins = await AdminLogin.findAll({
        attributes: ['id', 'name', 'email']
      });
      res.status(200).send({ data: admins });
    } catch (err) {
      res.status(500).send('internal server error');
    }
  },


  /**
   *
   * send password reset link to user email
   * @param {obj} req req object
   * @param {obj} res res object
   * @return {obj} json obj
   */
  async passwordResetLink(req, res) {
    const { email } = req.params;
    try {
      const user = await AdminLogin.findOne({
        where: {
          email
        }
      });
      if (!user) return res.status(400).send('Bad request');

      const payload = {
        admin: user.id
      };
      let token = jwty.encode(payload, keys.adminSecret);
      let link = `http://dashboard.carrotsuite.space/api/v1/admin/password-reset/${token}`;
      //const {url} = await settingsController.init()

      const msg = `Hi ${user.name} \n
            You recently requested for a password reset. click on the
            link below to reset your password, ignore if it wasn't you. Please bear in mind
            this link will expire in 24hrs, be sure to use it right away. \n ${link}`;
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


  async verifyToken(req, res) {
    const { token } = req.params;
    try {
      const payload = jwty.decode(token, keys.adminSecret);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };

      if (doesHaveKey(`admin`)) {
        const user = await VisitorSuite.findOne({
          where: {
            id: payload.admin
          }
        });
        if (user) {
          return res.redirect(
            `http://dashboard.carrotsuite.space/admin/password-reset?token=${token}`
          );
        }
        return res.status(400).send('broken link');
      }
      return res.status(400).send('broken link');
    } catch (err) {
      return res.status(500).send('internal server error');
    }
  },


  async resetPassword(req, res) {
    const { password, token } = req.body;

    if (!password) return res.status(400).send({ message: 'enter a new password' });
    const passStrength = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    if (!passStrength.test(password))
      return res
        .status(400)
        .send('password must be minimum of eight characters, at least one letter and one number');
    const hashedPassword = bcrypt.hashSync(password, 8);

    try {
      const payload = jwty.decode(token, keys.adminSecret);
      const doesHaveKey = key => {
        return Object.prototype.hasOwnProperty.call(payload, key) || false;
      };

      if (doesHaveKey(`admin`)) {
        await AdminLogin.update(
          { password: hashedPassword },
          {
            where: {
              id: payload.admin
            }
          }
        );
        return res.status(200).send({ message: 'password successfully reset' });
      }
      res.status(400).send('Broken link');
    } catch (err) {
      res.status(500).send('internal server error');
    }
  }

  
};

export default adminController;
