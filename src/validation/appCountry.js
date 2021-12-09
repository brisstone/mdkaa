/* eslint-disable no-param-reassign */
const Validator = require('validator');
const isEmpty = require('./is-empty');


const validateAppCountryInput = data => {
  const errors = {};
  const doesKeyExist = key => {
    return Object.prototype.hasOwnProperty.call(data, key) || false;
  };
  if (!doesKeyExist(`country`)) {
    errors.country = 'Add key country';
  }
  if (!doesKeyExist(`currency`)) {
    errors.currency = 'Add key currency';
  }
  if (!doesKeyExist(`currency_symbol`)) {
    errors.currency_symbol = 'Add key currency_symbol';
  }
  
  data.country = !isEmpty(data.country) ? data.country : '';
  data.currency = !isEmpty(data.currency) ? data.currency : '';
  data.currency_symbol = !isEmpty(data.currency_symbol) ? data.currency_symbol : ''; 

  if (!Validator.isNumeric(String(data.country))) {
    errors.country = 'Country must be numeric';
  }

  if (Validator.isEmpty(data.currency)) {
    errors.currency = 'currency name field is required';
  }

  if (Validator.isEmpty(data.currency_symbol)){
    errors.currency_symbol = 'currency_symbol name field is required';
  }
  return {
    errors,
    isValid: isEmpty(errors)
  };
};


export default validateAppCountryInput;