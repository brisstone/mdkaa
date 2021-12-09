/* eslint-disable no-param-reassign */
const Validator = require('validator');
const isEmpty = require('./is-empty');


const validateAddStaff = data => {
  const errors = {};
  const doesKeyExist = key => {
    return Object.prototype.hasOwnProperty.call(data, key) || false;
  };
  if (!doesKeyExist(`email`)) {
    errors.email = 'Add key email';
  }
  if (!doesKeyExist(`last_name`)) {
    errors.last_name = 'Add key last_name';
  }
  if (!doesKeyExist(`first_name`)) {
    errors.first_name = 'Add key first_name';
  }
  
  if (!doesKeyExist(`phone_number`)) {
    errors.phone_number = 'Add key phone_number';
  }
  data.staff_position = data.staff_position ? data.staff_position : '';
  data.email = data.email ? data.email : '';
  data.first_name = data.first_name ? data.first_name : '';
  data.last_name = data.last_name ? data.last_name : '';
  data.phone_number = data.phone_number ? data.phone_number : '';

  if (Validator.isEmpty(data.email)) {
    errors.email = 'Email field is required';
  }

  if (!Validator.isEmail(data.email)) {
    errors.email = 'Email is invalid';
  }

  if (Validator.isEmpty(data.first_name)) {
    errors.first_name = 'First name is required';
  }

  if (Validator.isEmpty(data.last_name)) {
    errors.last_name = 'Last name is required';
  }
  if (Validator.isEmpty(data.phone_number)) {
    errors.phone_number = 'Phone is required';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};


module.exports = validateAddStaff;