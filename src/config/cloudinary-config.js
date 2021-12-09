const cloudinary = require("cloudinary").v2;

const CLOUDINARY_CLOUD_NAME = "ppct";
const CLOUDINARY_API_KEY = "935446932649215";
const CLOUDINARY_API_SECRET = "LYJqPqcZ9LLqhIGJ64gq1e9MFWE"


cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});


const uploader = cloudinary.uploader;
module.exports = uploader;
