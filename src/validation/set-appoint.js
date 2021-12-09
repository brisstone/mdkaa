/* eslint-disable no-param-reassign */
const Validator = require('validator');
const isEmpty = require('./is-empty');


const validateSetAppoint = data => {
  const errors = [];
  const doesKeyExist = key => {
    return Object.prototype.hasOwnProperty.call(data, key) || false;
  };
  if (!doesKeyExist(`day`)) {
    errors.push('Add key day');
  }
  if (!doesKeyExist(`time`)) {
    errors.push('Add key time');
  }
  if (!doesKeyExist(`name`)) {
    errors.push('Add key name');
  }
  if (!doesKeyExist(`email`)) {
    errors.email.push('Add key email');
  }
  if (!doesKeyExist(`phone_number`)) {
    errors.push('Add key phone_number');
  }

  data.day = data.day ? data.day : '';
  data.time = data.time ? data.time : '';
  data.email = data.email ? data.email : '';
  data.name = data.name ? data.name : '';
  data.phone_number = data.phone_number ? data.phone_number : '';

  if (Validator.isEmpty(data.email)) {
    errors.push('Email field is required');
  }

  if (Validator.isEmpty(data.phone_number)) {
    errors.push('Phone field is required');
  }
  if (Validator.isEmpty(data.time)) {
    errors.push('time field is required');
  }
  if (Validator.isEmpty(data.name)) {
    errors.push('name field is required');
  }

  if (!Validator.isEmail(data.email)) {
    errors.push('Email is invalid');
  }
  if(doesKeyExist(`day`) && String(data.day).length > 0) {
    const date = new Date(data.day);
    const dateChecker = new Date()
    console.log(data.time, dateChecker.getHours())
    if(date.getDate() < dateChecker.getDate() && data.time < dateChecker.getHours()) {
      errors.push('Backdating error');
    }
  } else {
    errors.push('Invalid day of appointment');
  }

  return {
    errors
  };
};


module.exports = validateSetAppoint;