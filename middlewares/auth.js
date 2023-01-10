const jwt = require("jsonwebtoken");
const secret = require("../utils/password").secret;

module.exports = (req, res, next) => {
  try {
    const header = req.get("Authorization");
    if (!header) {
      req.isAuth = false;
      return next();
    }

    const token = header.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (!decodedToken) {
      req.isAuth = false;
      return next();
    }
    req.userId = decodedToken.userId;
    req.isAuth = true;
    next();
  } catch (errors) {
    throw errors;
  }
};
