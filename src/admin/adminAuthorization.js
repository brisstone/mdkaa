const jwt = require('jsonwebtoken');
const keys = require('../config/keys');


export const isAdmin = (req, res, next) => {
  let token = req.headers['authorization'] || req.headers['x-access-token'];
  if (token && token.startsWith('Bearer')) token = token.slice(7);
  if (!token)
    return res
      .status(401)
      .send({ message: 'You do not have the authorization to access this resource' });

  jwt.verify(token, keys.adminSecret, err => {
    if (err) {
      return res.status(401).send(err.message);
    }

    next();
  });
};
