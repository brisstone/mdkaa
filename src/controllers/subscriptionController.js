const Sequelize = require('sequelize');
const models = require('../models');
const axios = require('axios');
const moment = require('moment');

// Load Input Validation
const settingsController = require('./settingsController');
const userController = require('./userController');

// Load models
const {
  visitorsuite_company_plan,
  visitorsuite_plans,
  visitorsuite_company,
  visitorsuite_location,
  company_billing
} = models;
const Op = Sequelize.Op;
const PAYSTACK_PK = 'pk_test_706389832100efca025561dc6d094c3b5bc9c0f2';

const PAYSTACK_SK = 'sk_test_47c36c20aaa66e1d9166054e01de3d531e47b294';
const baseUrl = "http://dashboard.carrotsuite.space"

const _MS_PER_DAY = 1000 * 60 * 60 * 24;

const subscriptionController = {

  /**
   * Get the difference in days between two dates
   * @param {date} firstDate first date
   * @param {date} secondDate second date
   * @returns number of days
   */
  dateDiffInDays(firstDate, secondDate) {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    const utc2 = Date.UTC(secondDate.getFullYear(), secondDate.getMonth(), secondDate.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
  },


  /**
   * Get the sum  in days between two dates
   * @param {date} firstDate first date
   * @param {date} secondDate second date
   * @returns number of days
   */
  dateAddInDays(firstDate, secondDate) {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    const utc2 = Date.UTC(secondDate.getFullYear(), secondDate.getMonth(), secondDate.getDate());

    return Math.floor((utc2 + utc1) / _MS_PER_DAY);
  },


  /**
   * Check compaines subscription plan expiry.
   * send reminder.
   * performs recurring billing.
   * performs plan downgrading.
   */
  checkAndUpdateSubscription() {
    // get all registered companies plan
    visitorsuite_company_plan.findAll({
      where: {
        interval_remaining: { [Op.not]: 0 }
      },
      include: [
        {
          model: visitorsuite_plans,
          as: 'planInfo'
        }
      ]
    }).then(companyPlans => {
      if (companyPlans.length > 0) {
        companyPlans.map(companyPlan => {
          let start_date = new Date(companyPlan.start_date),
            interval = parseInt(companyPlan.interval_remaining),
            expiring_date = new Date(companyPlan.expiring_date),
            today_date = new Date(Date.now());
          let msg = '';

          visitorsuite_company.findOne({
            where: {
              id: companyPlan.company
            }
          }).then(company => {
            //If subscription is over
            if (subscriptionController.dateDiffInDays(start_date, today_date) == interval) {
              //send subscription finished message

              if (companyPlan.planInfo.plan_name === 'Trial') {
                msg = `This is to notify you that your Free trial with Carrotsuite Space is exhausted. Kinldy subscribe to get more. Visit ${baseUrl} to renew your subscription`;
              } else {
                msg = `This is to notify you that your subscription with Carrotsuite Space is exhausted. Kinldy pay to get more subscription. Visit ${baseUrl} to renew your subscription`;
              }
              settingsController
                .sendEmailMessage(company.companyemail, `Subscription with Carrotsuite Space`, msg)
                .then(() => {
                  console.log('message sent');
                  // process recurring debit if company plan is not free trial
                  if (companyPlan.planInfo.plan_name !== 'Trial') {
                    visitorsuite_plans.findOne({
                      where: {
                        id: companyPlan.plan
                      }
                    }).then(plan => {
                      visitorsuite_location.count({
                        where: {
                          company: company.id
                        }
                      }).then(numOfLocation => {
                        let amount = 0;
                        // multiply the amount by number of companies location
                        if (companyPlan.period === 'month')
                          amount = plan.monthly_billing * numOfLocation;
                        if (companyPlan.period === 'year')
                          amount = plan.yearly_billing * numOfLocation;

                        //Initiate recurring billing
                        console.log('initing recurring');
                        const secretKey = `Bearer ${PAYSTACK_SK}`;
                        const config = {
                          headers: {
                            authorization: secretKey,
                            'content-type': 'application/json',
                            'cache-control': 'no-cache'
                          }
                        };
                        const authorization_code = companyPlan.authorization_code;
                        //convert the amount to kobo by multiplying by 100
                        // needed for paystack precision
                        const body = {
                          email: company.companyemail,
                          authorization_code,
                          amount: amount * 100
                        };

                        axios
                          .post(
                            'https://api.paystack.co/transaction/charge_authorization',
                            body,
                            config
                          )
                          .then(res => {
                            // successfull recurring billing
                            // resubscribe company

                            const start_date = moment(new Date());
                            let expiring_date = '';

                            if (companyPlan.period == 'month')
                              expiring_date = moment(start_date).add(1, 'M');
                            if (companyPlan.period == 'year')
                              expiring_date = moment(start_date).add(1, 'year');

                            const interval_remaining = expiring_date.diff(start_date, 'days');

                            const data = {
                              start_date: start_date.format('YYYY-MM-DD'),
                              expiring_date: expiring_date.format('YYYY-MM-DD')
                            };
                            visitorsuite_company_plan.update(
                              {
                                start_date: new Date(data.start_date),
                                expiring_date: new Date(data.expiring_date),
                                interval_remaining,
                                period: companyPlan.period
                              },
                              {
                                where: {
                                  id: companyPlan.id
                                }
                              }
                            ).then(repo => {
                              console.log('resubscription successful');
                            });
                          });
                      });
                    });
                  }
                });
            }

            //If subscription is still on
            if (subscriptionController.dateDiffInDays(start_date, today_date) < interval) {
              //no need
              //calculate remaining days
              console.log(
                `${company.name} has ${interval -
                  subscriptionController.dateDiffInDays(
                    start_date,
                    today_date
                  )} more days to subscription expiring`
              );
            }
            // if Trial plan
            if (companyPlan.planInfo.plan_name === 'Trial') {
              //If trial remains 4, 2 or 1 day to subscription over, send reminder
              const expendedDays = subscriptionController.dateDiffInDays(start_date, today_date);
              if (
                expendedDays === interval - 4 ||
                expendedDays === interval - 2 ||
                expendedDays === interval - 1
              ) {
                `This is to notify you that your Free trial with CarrotsuiteSpace remains ${interval -
                  expendedDays} days to expiry. Kinldy pay to get more subscription. Visit ${baseUrl} to renew your subscription`;
                settingsController
                  .sendEmailMessage(
                    company.companyemail,
                    `Subscription with Carrotsuite Space`,
                    msg
                  )
                  .then(() => {
                    console.log('message sent');
                  });
              }
            }
            // if monthly plan
            if (companyPlan.period === 'month') {
              //If monthly plan remains 7, 2 or 1 day to subscription over, send reminder
              const expendedDays = subscriptionController.dateDiffInDays(start_date, today_date);
              if (
                expendedDays === interval - 7 ||
                expendedDays === interval - 3 ||
                expendedDays === interval - 1
              ) {
                `This is to notify you that your subcription with Carrotsuite Space remains ${interval -
                  expendedDays} days to expiry. Kinldy pay to get more subscription. Visit ${baseUrl} to renew your subscription`;
                settingsController
                  .sendEmailMessage(
                    company.companyemail,
                    `Subscription with CarrotsuiteSpace`,
                    msg
                  )
                  .then(() => {
                    console.log('message sent');
                  });
              }
            }

            // if yearly plan
            if (companyPlan.period === 'year') {
              //If yearly plan remains 31, 14 or 7 days to subscription over, send reminder
              const expendedDays = subscriptionController.dateDiffInDays(start_date, today_date);
              if (
                expendedDays === interval - 31 ||
                expendedDays === interval - 14 ||
                expendedDays === interval - 7
              ) {
                `This is to notify you that your subcription with Carrotsuite Space remains ${interval -
                  expendedDays} days to expiry. Kinldy pay to get more subscription. Visit ${baseUrl} to renew your subscription`;
                settingsController
                  .sendEmailMessage(
                    company.companyemail,
                    `Subscription with Carrotsuite Space`,
                    msg
                  )
                  .then(() => {
                    console.log('message sent');
                  });
              }
            }
            //If subscription is over
            if (subscriptionController.dateDiffInDays(start_date, today_date) > interval) {
              //After subscription is over, Give them extra 30days to renew
              if (subscriptionController.dateDiffInDays(today_date, expiring_date) <= 30) {
                //send message to upgrade
                if (companyPlan.planInfo.plan_name === 'Trial') {
                  msg = `This is to notify you that your Free trial with Carrotsuite Space has expired. Kinldy pay to get more subscription. Visit ${baseUrl} to renew your subscription`;
                } else {
                  msg = `This is to notify you that your subscription with Carrotsuite Space has expired. Kinldy pay to get more subscription. Visit ${baseUrl} to renew your subscription`;
                }
                settingsController
                  .sendEmailMessage(
                    company.companyemail,
                    `Subscription with Carrotsuite Space`,
                    msg
                  )
                  .then(() => {
                    console.log('message sent');
                  });
              } else {
                console.log('downgring');
                // if exceeds 30 days grace period
                //changePlan to Free Plan
                //make interval 0
                visitorsuite_plans.findOne({
                  where: {
                    plan_name: 'Free'
                  }
                }).then(plan => {
                  if (plan) {
                    visitorsuite_company_plan.update(
                      {
                        start_date: Date.now(),
                        interval_remaining: 0,
                        expiring_date: new Date('0'),
                        previous_plan: companyPlan.plan,
                        plan: plan.id
                      },
                      {
                        where: {
                          id: companyPlan.id
                        }
                      }
                    ).then(repo => {
                      console.log('No more plan');
                    });
                  } else console.log('Free plan not found');
                });
              }
            }
          });
        });
      } else {
        console.log('No subscriptions yet');
      }
    });
  },

  reSubscribe() {
    /**
     * x = todayDate - startDate
     * interval - x  = remaining
     * newPlanDuration + Remaining = new interval
     * startdate = date.now()
     * expiringDate = startdate.getDate() + interval
     */
  },
  /**
   * Initiate subcription payment
   * @param {obj} req req object
   * @param {obj} res res object
   * @route POST: '/api/v1/subscription/subscribe'
   */
  async initiatePayment(req, res) {
    const secretKey = `Bearer ${PAYSTACK_SK}`;
    const { start_date, expiring_date, plan, interval_remaining, period } = req.body;
    try {
      let amount = 0;
      const result = await visitorsuite_plans.findOne({
        where: {
          id: plan
        }
      });
      const locations = await visitorsuite_location.count({
        where: {
          company: req.user.company
        }
      });
      if (period === 'month') amount = result.monthly_billing * locations;
      if (period === 'year') amount = result.yearly_billing * locations;
      const company = await userController.getCompany(req, res);
      const email = company.companyemail;

      // create billing record
      const billing = await company_billing.create({
        company: req.user.company,
        plan,
        amount,
        period,
        date: Date.now(),
        payment_status: 'cancelled'
      });

      // multiply amount by 100 to convert to kobo
      // needed for paystack precision
      const body = {
        amount: amount * 100,
        email
      };
      body.metadata = {
        expiring_date,
        start_date,
        interval_remaining,
        plan,
        period,
        company: req.user.company,
        billing_id: billing.id
      };
      const config = {
        headers: {
          authorization: secretKey,
          'content-type': 'application/json',
          'cache-control': 'no-cache'
        }
      };

      const { data } = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        body,
        config
      );
      console.log(data, '.......')
      if (data) {
        const authUrl = data.data.authorization_url;
        console.log(data.data);
        return res.status(200).send({ data: authUrl });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  },

  /**
   * Verify subcription payment
   * @param {obj} req req object
   * @param {obj} res res object
   * @route GET: '/api/v1/subscription/callback'
   */
  async verifyPayment(req, res) {
    const secretKey = `Bearer ${PAYSTACK_SK}`;

    const config = {
      headers: {
        authorization: secretKey,
        'content-type': 'application/json',
        'cache-control': 'no-cache'
      }
    };
    const { reference } = req.query;

    try {
      const { data } = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        config
      );

      const ref = data.data.reference;
      const {
        start_date,
        expiring_date,
        interval_remaining,
        plan,
        period,
        company,
        billing_id
      } = data.data.metadata;
      // authorization code for initializing recurring billing
      const { authorization_code } = data.data.authorization;
      if (ref) {
        //successful payment

        const previous_plan = await 	visitorsuite_company_plan.findOne({
          where: { company }
        });
        await 	visitorsuite_company_plan.update(
          {
            start_date: new Date(start_date),
            expiring_date: new Date(expiring_date),
            interval_remaining: parseInt(interval_remaining),
            plan,
            period,
            previous_plan: previous_plan.plan,
            authorization_code
          },
          {
            where: {
              company
            }
          }
        );
        // update billing record to paid
        await company_billing.update(
          { payment_status: 'paid' },
          {
            where: {
              id: billing_id
            }
          }
        );
        // redirect to subscription success page
        res.redirect(`${baseUrl}/payment-success`);
      }
      //unsuccessful payment
      // redirect to subscription error page
      return res.redirect(`${baseUrl}/payment-failed`);
    } catch (err) {
      console.log(err);
      // redirect to subscription error page
      return res.redirect(`${baseUrl}/payment-failed`);
    }
  },


  /**
   * Get billing history records
   * @param {obj} req req object
   * @param {obj} res res object
   * @route GET: '/api/v1/subscription/billings'
   */
  async getBillings(req, res) {
    try {
      const billings = await company_billing.findAll({
        where: {
          company: req.user.company
        },
        include: [
          {
            model: visitorsuite_plans,
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


  /**
   * Get company subscribed plan
   * @param {obj} req req object
   * @param {obj} res res object
   * @route GET: '/api/v1/subscription/plan'
   */
  async getActivePlan(req, res) {
    try {
      const plan = await 	visitorsuite_company_plan.findOne({
        where: {
          company: req.user.company,
          interval_remaining: { [Op.not]: 0 }
        },
        attributes: ['id', 'start_date', 'expiring_date', 'period'],
        include: [
          {
            model: visitorsuite_plans,
            as: 'planInfo'
          }
        ]
      });

      res.status(200).send({ data: plan });
    } catch (err) {
      console.log(err);
      res.status(500).send('internal server error');
    }
  }

};


module.exports = subscriptionController;
