const rules = require('../pbac');
const model = require('../models');

const { visitorsuite_plans, visitorsuite_company_plan } = model;

/**
 * Checks if user plan has access to perform access route
 * @param {string} action action to perform
 */
const grantAccess = action => {
  console.log('dd')
  return async (req, res, next) => {
    try {
      const companyPlan = await visitorsuite_company_plan.findOne({
        where: {
          company: req.user.company
        },
        include: [
          {
            model: visitorsuite_plans,
            as: 'planInfo',
            attributes: ['id', 'plan_name']
          }
        ]
      });
      const plan = companyPlan.planInfo.plan_name;

      const permission = rules[plan];
      // if user plan does not exist, bounce user
      if (!permission)
        return res.status(401).send('You need a subscription plan to perform this action');

        // if user plan has rights to perform action, grant pass
      if (permission.includes(action)) {
        req.user.plan = companyPlan.planInfo.plan_name
        next();
      } else {
        // user is not upto 18, bounce user
        return res.status(401).send('Upgrade your subscription plan to perform this action');
      }
    } catch (err) {
      console.log(err);
      return res.status(500).send('internal server error');
    }
  };
};


/**
 * Get a single plan
 * @param {obj} req req obj
 * @param {obj} res res obj
 * @route GET '/api/v1/plans/:name'
 */
const getPlan = async (req, res) => {
  try {
    const { name } = req.params; // plan name
    console.log(name, 'kaiiwqkaass')

    const plan = await visitorsuite_plans.findOne({
      where: {
        plan_name: name
      }
    });

    console.log(plan, 'jjjjjjjjjjj')
    res.status(200).send({ data: plan });
  } catch (err) {
    console.log(err);
    res.status(500).send('internal server error');
  }
};


// export default grantAccess;
module.exports = {grantAccess, getPlan};
