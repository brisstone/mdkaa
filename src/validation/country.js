/* eslint-disable no-param-reassign */
const Validator = require('validator');
const isEmpty = require('./is-empty');


const validateCountryInput = data => {
  const errors = {};
  const doesKeyExist = key => {
    return Object.prototype.hasOwnProperty.call(data, key) || false;
  };
  if (!doesKeyExist(`name`)) {
    errors.name = 'Add key name';
  }
  if (!doesKeyExist(`short_name`)) {
    errors.short_name = 'Add key short_name';
  }
  if (!doesKeyExist(`phone_extension`)) {
    errors.phone_extension = 'Add key phone_extension';
  }
  
  data.name = !isEmpty(data.name) ? data.name : '';
  data.short_name = !isEmpty(data.short_name) ? data.short_name : '';
  data.phone_extension = !isEmpty(data.phone_extension) ? data.phone_extension : ''; 

  if (!Validator.isLength(data.name, { min: 2, max: 40 })) {
    errors.name = 'Name must be between 2 and 40 characters';
  }

  if (Validator.isEmpty(data.short_name)) {
    errors.short_name = 'Short name field is required';
  }

  if (Validator.isEmpty(data.phone_extension)) {
    errors.phone_extension = 'Phone extention field is required';
  }
  return {
    errors,
    isValid: isEmpty(errors)
  };
};


export default validateCountryInput;