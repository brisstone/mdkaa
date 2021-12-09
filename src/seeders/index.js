import models from '../models';
import bcrypt from 'bcryptjs';

const { adminlogin } = models;

const seedsController ={
  async seedAdmin(){
   const admins = await adminlogin.findAll();
   if(!admins.length){
    const hashedPassword = bcrypt.hashSync('123456', 8);
     await adminlogin.create({
       name: 'Dennis',
       email: 'ccarrotsuitee@gmail.com',
       password: hashedPassword,
       others: 'nil'
     })
   }
  }
};

export default seedsController;
