/* eslint-disable no-param-reassign */
const Validator = require('validator');
const isEmpty = require('./is-empty');


const validateRegisterInput = data => {
  const errors = {};
  const doesKeyExist = key => {
    return Object.prototype.hasOwnProperty.call(data, key) || false;
  };
  if (!doesKeyExist(`name`)) {
    errors.name = 'Add key name';
  }
  if (!doesKeyExist(`address`)) {
    errors.address = 'Add key address';
  }
  if (!doesKeyExist(`email`)) {
    errors.email = 'Add key email';
  }
  if (!doesKeyExist(`phone_number`)) {
    errors.phone_number = 'Add key phone_number';
  }

  if (!doesKeyExist(`purpose`)) {
    errors.purpose = 'Add key purpose';
  }
  if (!doesKeyExist(`custom`)) {
    errors.custom = 'Add key custom';
  }
  if (!doesKeyExist(`staff`)) {
    errors.staff = 'Add key staff';
  }
  if (!doesKeyExist(`date`)) {
    errors.date = 'Add key date';
  }

  if(doesKeyExist(`date`) && doesKeyExist(`name`) && doesKeyExist(`address`) && doesKeyExist(`email`) && doesKeyExist(`purpose`) && doesKeyExist(`custom`) && doesKeyExist(`staff`)) {
        data.name = !isEmpty(data.name) ? data.name : '';
        data.email = !isEmpty(data.email) ? data.email : '';
        data.address = !isEmpty(data.address) ? data.address : '';
        data.phone_number = !isEmpty(data.phone_number) ? data.phone_number : '';

        const doesKeyExist2 = key => {
            return Object.prototype.hasOwnProperty.call(data.purpose, key) || false;
        };

        if(doesKeyExist2(`id`) && doesKeyExist2(`type`)) {
            if (!Validator.isLength(data.name, { min: 6, max: 40 })) {
                errors.name = 'Add a valid name. min of 6 values';
            }
            if (!Validator.isLength(data.address, { min: 4, max: 40 })) {
                errors.address = 'Add a valid address. min of 4 values';
            }
    
            if (Validator.isEmpty(data.email)) {
                errors.email = 'Email field is required';
            }
    
            if (!Validator.isEmail(data.email)) {
                errors.email = 'Email is invalid';
            }
    
            if (Validator.isEmpty(data.name)) {
                errors.name = 'Name is required';
            }
            
            if (Validator.isEmpty(data.phone_number)) {
                errors.phone_number = 'Phone number is required';
            }
    
            if(!Validator.isISO8601(String(data.date))) {
                errors.date = "Add a date";
            }

            if(!Array.isArray(data.custom)) {
              errors.custom = 'Custom is an array';
            }
            if(data.custom.length > 0) {
              data.custom.forEach(element => {
                const doesKeyExist3 = key => {
                  return Object.prototype.hasOwnProperty.call(element, key) || false;
                };
                if(!(doesKeyExist3(`id`) && doesKeyExist3(`value`))) {
                  errors.custom = 'Custom uses keys id and value';
                }
              });
            }

            if(!Array.isArray(data.staff)) {
                errors.staff = 'Staff is an array';
              }

            if(data.staff.length > 0) {
                data.staff.forEach(element => {
                  const doesKeyExist3 = key => {
                    return Object.prototype.hasOwnProperty.call(element, key) || false;
                  };
                  if(!(doesKeyExist3(`id`))) {
                    errors.staff = 'Add staff value';
                  } else {
                      if(!Validator.isNumeric(String(element.id))) {
                          errors.staff = 'Add staff value .. Numeric';
                      }
                  }
                });
              } else {
                  errors.staff = 'Add staffs';
              }
    
            if(!(String(data.purpose.type).toLowerCase() == 'default' || String(data.purpose.type).toLowerCase() == 'custom')){
                errors.purpose = 'Types are wrong';
            }
        } else {
            errors.key = `Purpose needs id and type`;
        }
    } else {
        errors.key = 'Keys doesn\'t exists';
    }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};


export default validateRegisterInput;