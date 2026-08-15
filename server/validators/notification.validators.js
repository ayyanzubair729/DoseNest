const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

const assertValidObjectId = (req, _res, next) => {
  const id = req.params.id;
  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new AppError("Invalid notification id.", 400));
  }
  next();
};

module.exports = { assertValidObjectId };
