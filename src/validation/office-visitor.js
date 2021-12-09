/* eslint-disable no-param-reassign */
const Validator = require('validator');
const isEmpty = require('./is-empty');


const validateRegisterInput = data => {
  const errors = [];

  const doesKeyExist = key => {
    return Object.prototype.hasOwnProperty.call(data, key) || false;
  };

  if (
    doesKeyExist(`name`) &&
    doesKeyExist(`email`) &&
    doesKeyExist(`phone_number`)
  ) {
    data.name = data.name ? data.name : '';
    data.email = data.email ? data.email : '';
    data.address = data.address ? data.address : '';
    data.phone_number = data.phone_number ? data.phone_number : '';
    data.purpose = data.purpose ? data.purpose : '';

    if (!Validator.isLength(data.name, { min: 3, max: 40 })) {
      errors.push('Add a valid name. min of 3 values');
    }

    if (Validator.isEmpty(data.email)) {
      errors.push('Email field is required');
    }
    if (Validator.isEmpty(data.purpose)) {
      errors.push('purpose field is required');
    }

    if (!Validator.isEmail(data.email)) {
      errors.push('Email is invalid');
    }

    if (Validator.isEmpty(data.name)) {
      errors.push('Name is required');
    }

    if (Validator.isEmpty(data.phone_number)) {
      errors.push('Phone number is required');
    }
  }

  return {
    errors
  };
};


module.exports = validateRegisterInput;