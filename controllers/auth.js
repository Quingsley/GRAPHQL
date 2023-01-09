const { validationResult } = require("express-validator/check");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const errorHandler = require("../utils/error-handler").errorHandler;
const throwError = require("../utils/error-handler").throwError;
const secret = require("../utils/password").secret;

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req).errors;
    if (errors.length > 0) {
      throwError("Validation failed", 422, errors);
    }
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    const HASHED_PASSWORD = await bcrypt.hash(password, 12);
    const user = new User({
      name: name,
      password: HASHED_PASSWORD,
      email: email,
    });
    const result = await user.save();
    res.status(201).json({
      message: "User Created successfully",
      user: result._id,
    });
  } catch (errors) {
    errorHandler(errors, next);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const user = await User.findOne({ email: email });
    if (!user) {
      throwError("User with the email does not exist", 401);
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throwError("Invalid email or password", 401);
    }
    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id,
      },
      `${secret}`,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      token: token,
      userId: user._id.toString(),
    });
  } catch (errors) {
    errorHandler(errors, next);
  }
};
