const jwt = require("jsonwebtoken");
const throwError = require("../utils/error-handler").throwError;
const secret = require("../utils/password").secret;

module.exports = (req, res, next) => {
  try {
    const header = req.get("Authorization");
    if (!header) {
      throwError("Not Authenticated", 401);
    }

    const token = header.split(" ")[1];
    const decodedToken = jwt.verify(token, secret);
    if (!decodedToken) {
      throwError("Not authorized", 401);
    }
    req.userId = decodedToken.userId;
    next();
  } catch (errors) {
    throw errors;
  }
};
