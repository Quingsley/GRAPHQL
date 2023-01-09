const { validationResult } = require("express-validator/check");

const User = require("../models/user");
const throwError = require("../utils/error-handler").throwError;
const errorHandler = require("../utils/error-handler").errorHandler;

exports.getUserStatus = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      throwError("No user found", 404);
    }
    const status = user.status;
    res.status(200).json({
      message: "Retrieved user status successfully",
      status: status,
    });
  } catch (error) {
    errorHandler(error, next);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req).errors;
    if (errors.length > 0) {
      throwError("Validation failed Bad Input", 422, errors);
    }

    const status = req.body.status;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      throwError("No user found", 404);
    }
    user.status = status;
    const result = await user.save();
    if (result) {
      res.status(200).json({
        message: "Status updated successfully",
        status: user.status,
      });
    }
  } catch (error) {
    errorHandler(error, next);
  }
};
