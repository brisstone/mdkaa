/* eslint-disable no-param-reassign */
const Validator = require('validator');
const isEmpty = require('./is-empty');


const validateSetAppointDate = data => {
    const errors = {};
    const doesKeyExist = key => {
      return Object.prototype.hasOwnProperty.call(data, key) || false;
    };

    if (!doesKeyExist(`month`)) {
        errors.month = 'Add key month';
    }
    if (!doesKeyExist(`day`)) {
        errors.day = 'Add key day';
    }
    if (!doesKeyExist(`time`)) {
        errors.time = 'Add key time';
    }

    if(doesKeyExist(`day`) && doesKeyExist(`time`) && doesKeyExist(`month`)) {
        if(!Validator.isNumeric(String(data.day))){
            errors.day = 'Set Appointment day';
        }
        if(String(data.month) > 0) {
            if(!Validator.isNumeric(String(data.month))){
                errors.month = 'Set Valid Month';
            }
            if(Validator.isNumeric(String(data.month))){
                const checkMonth = new Date();
                if(parseInt(data.month) >=1 && parseInt(data.month) <= 12) {
                    if(parseInt(data.month) < checkMonth.getMonth() + 1) {
                        errors.month = 'Backdating errors';
                    }
                } else {
                    errors.month = 'Set Valid Month';
                }
            }
        }
        if(String(data.time) > 0) {
            if(!Validator.isNumeric(String(data.time))){
                errors.time = 'Set Valid Time';
            }
            if(!(parseInt(data.time) <= 24 && parseInt(data.time) >=0)) errors.time = 'Set Valid time';
        }
        if(Validator.isNumeric(String(data.day))) {
            const checkDay = new Date();
            if(parseInt(data.day) >= 1 && parseInt(data.day) <= 31) {
                if(parseInt(data.day) < checkDay.getDate()) {
                        errors.day = 'Backdating errors';
                    }
                } else {
                    errors.day = 'Set Valid Day';
                }
        }
    } else {
        errors.key = ' Add keys';
    }

    return {
        errors,
        isValid: isEmpty(errors)
    };
};
    

export default validateSetAppointDate;