const Validator = require('validator');


const validatePlanInputs = data => {
  const errors = [];
  const doesKeyExist = key => {
    return Object.prototype.hasOwnProperty.call(data, key) || false;
  };
  if (!doesKeyExist(`plan_name`)) {
    errors.push('Add key plan_name');
  }
  if (!doesKeyExist(`monthly_billing`)) {
    errors.push('Add key monthly billing');
  }
  if (!doesKeyExist(`yearly_billing`)) {
    errors.push('Add key yearly_billing');
  }
  if (!Validator.isLength(data.plan_name, { min: 2, max: 40 })) {
    errors.push('Name must be between 2 and 40 characters');
  }
  if (!Validator.isNumeric(String(data.monthly_billing))) {
    errors.push('monthly billing must be numeric');
  }
  if (!Validator.isNumeric(String(data.yearly_billing))) {
    errors.push('yearly billing must be numeric');
  }
  return {
    errors
  };
};


export default validatePlanInputs;