/* eslint-disable no-param-reassign */
const Validator = require('validator');
const isEmpty = require('./is-empty');


const validateLoginInput = data => {
  const errors = {};

  data.email = data.email ? data.email : '';
  data.password = data.password ? data.password : '';

  if (!Validator.isEmail(data.email)) {
    errors.email = 'Email is invalid';
  }

  if (Validator.isEmpty(data.email)) {
    errors.email = 'Email field is required';
  }

  if (Validator.isEmpty(data.password)) {
    errors.password = 'Password field is required';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};


module.exports = validateLoginInput