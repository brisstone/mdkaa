/* eslint-disable no-param-reassign */
const Validator = require('validator');
const isEmpty = require('./is-empty');

module.exports = function validateRegisterInput(data) {
  let errors = {}

  const doesKeyExist = key => {
        return Object.prototype.hasOwnProperty.call(data, key) || false;
      };
      if (!doesKeyExist(`company_name`)) {
        errors.message = 'Add key company_name';
      }
      if (!doesKeyExist(`email`)) {
        errors.message = 'Add key email';
      }
      if (!doesKeyExist(`password`)) {
        errors.message = 'Add key password';
      }
      if (!doesKeyExist(`password2`)) {
        errors.message = 'Add key password_2';
      }
      if (!doesKeyExist(`last_name`)) {
        errors.message = 'Add key last_name';
      }
      if (!doesKeyExist(`first_name`)) {
        errors.message = 'Add key first_name';
      }
      if (!doesKeyExist(`option`)) {
        errors.message = 'Add key option';
      }
      console.log('kkk')
      data.company_name = data.company_name ? data.company_name : '';
      data.email = data.email ? data.email : '';
      data.password = data.password ? data.password : '';
      data.password2 = data.password2 ? data.password2 : '';
      data.first_name = data.first_name ? data.first_name : '';
      data.last_name = data.last_name ? data.last_name : '';
      
      if (!Validator.isLength(data.company_name, { min: 2, max: 40 })) {
        errors.message = 'Name must be between 2 and 40 characters';
      }
    
      if (Validator.isEmpty(data.company_name)) {
        errors.message = 'Name field is required';
      }
      if (Validator.isEmpty(data.email)) {
        errors.message = 'Email field is required';
      }
    
      if (!Validator.isEmail(data.email)) {
        errors.message = 'Email is invalid';
      }
    
      if (!Validator.isAlphanumeric(String(data.password))) {
        errors.message = 'Password must be alphanumeric';
      }
    
      if (!Validator.isLength(data.password, { min: 6, max: 30 })) {
        errors.message = 'Password must be at least 6 characters';
      }
    
      if (Validator.isEmpty(data.password2)) {
        errors.message = 'Confirm password field is required';
      }
    
      if (!Validator.equals(data.password, data.password2)) {
        errors.message = 'Passwords must match';
      }
    
     /**
      * 
      *  if (Validator.isEmpty(data.first_name)) {
        errors.first_name = 'First name is required';
      }
    
      if (Validator.isEmpty(data.last_name)) {
        errors.last_name = 'Last name is required';
      }
      */
    
      
      if(!(String(data.option).toLowerCase() == 'office' || String(data.option).toLowerCase() == 'workspace' || String(data.option).toLowerCase() == 'estate')){
        errors.message = 'Options are wrong';
      }

  // data.email = data.email ? data.email : ''
  // data.password = data.password ? data.password : ''

  // if (!Validator.isEmail(data.email)) {
  //   errors.email = 'Email is invalid'
  // }

  // if (Validator.isEmpty(data.email)) {
  //   errors.email = 'Email is required'
  // }

  // if (!Validator.isLength(data.password, { min: 6, max: 30 })) {
  //   errors.password = 'Password must have 6 chars'
  // }
   // do more validation here
  return {
    errors,
    isValid: Object.keys(errors).length === 0
    
  }
} 


// export const validateRegisterInput = (body) => {
//   console.log("kkkkkkkkkkkkkkkkkkkkk",body)
//   const errors = {};
//   const doesKeyExist = key => {
//     return Object.prototype.hasOwnProperty.call(data, key) || false;
//   };
//   if (!doesKeyExist(`company_name`)) {
//     errors.company_name = 'Add key company_name';
//   }
//   if (!doesKeyExist(`email`)) {
//     errors.email = 'Add key email';
//   }
//   if (!doesKeyExist(`password`)) {
//     errors.password = 'Add key password';
//   }
//   if (!doesKeyExist(`password2`)) {
//     errors.password2 = 'Add key password_2';
//   }
//   if (!doesKeyExist(`last_name`)) {
//     errors.last_name = 'Add key last_name';
//   }
//   if (!doesKeyExist(`first_name`)) {
//     errors.first_name = 'Add key first_name';
//   }
//   if (!doesKeyExist(`option`)) {
//     errors.option = 'Add key option';
//   }
//   console.log('kkk')
//   data.company_name = !isEmpty(data.company_name) ? data.company_name : '';
//   data.email = !isEmpty(data.email) ? data.email : '';
//   data.password = !isEmpty(data.password) ? data.password : '';
//   data.password2 = !isEmpty(data.password2) ? data.password2 : '';
//   data.first_name = !isEmpty(data.first_name) ? data.first_name : '';
//   data.last_name = !isEmpty(data.last_name) ? data.last_name : '';
  
//   if (!Validator.isLength(data.company_name, { min: 2, max: 40 })) {
//     errors.company_name = 'Name must be between 2 and 40 characters';
//   }

//   if (Validator.isEmpty(data.company_name)) {
//     errors.company_name = 'Name field is required';
//   }
//   if (Validator.isEmpty(data.email)) {
//     errors.email = 'Email field is required';
//   }

//   if (!Validator.isEmail(data.email)) {
//     errors.email = 'Email is invalid';
//   }

//   if (!Validator.isAlphanumeric(String(data.password))) {
//     errors.password = 'Password must be alphanumeric';
//   }

//   if (!Validator.isLength(data.password, { min: 6, max: 30 })) {
//     errors.password = 'Password must be at least 6 characters';
//   }

//   if (Validator.isEmpty(data.password2)) {
//     errors.password2 = 'Confirm password field is required';
//   }

//   if (!Validator.equals(data.password, data.password2)) {
//     errors.password2 = 'Passwords must match';
//   }

//  /**
//   * 
//   *  if (Validator.isEmpty(data.first_name)) {
//     errors.first_name = 'First name is required';
//   }

//   if (Validator.isEmpty(data.last_name)) {
//     errors.last_name = 'Last name is required';
//   }
//   */

  
//   if(!(String(data.option).toLowerCase() == 'office' || String(data.option).toLowerCase() == 'workspace' || String(data.option).toLowerCase() == 'estate')){
//     errors.option = 'Options are wrong';
//   }
//   return {
//     errors,
//     isValid: isEmpty(errors)
//   };
// };


