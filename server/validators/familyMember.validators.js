const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

const RELATIONSHIPS = ["self", "partner", "parent", "grandparent", "child", "sibling", "other"];

const assertValidObjectId = (req, _res, next) => {
  const id = req.params.id;
  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new AppError("Invalid id.", 400));
  }
  next();
};

const validateMemberInput = (req, _res, next) => {
  const { name, relationship, dateOfBirth, notes } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return next(new AppError("Family member name is required.", 400));
  }
  if (name.trim().length > 80) {
    return next(new AppError("Family member name must be 80 characters or fewer.", 400));
  }
  if (relationship !== undefined && relationship !== null) {
    if (!RELATIONSHIPS.includes(relationship)) {
      return next(
        new AppError(`Relationship must be one of: ${RELATIONSHIPS.join(", ")}.`, 400)
      );
    }
  }

  let parsedDob = null;
  if (dateOfBirth) {
    parsedDob = new Date(dateOfBirth);
    if (Number.isNaN(parsedDob.getTime())) {
      return next(new AppError("Date of birth is not a valid date.", 400));
    }
    if (parsedDob > new Date()) {
      return next(new AppError("Date of birth cannot be in the future.", 400));
    }
  }
  if (notes !== undefined && notes !== null && String(notes).trim().length > 500) {
    return next(new AppError("Notes must be 500 characters or fewer.", 400));
  }

  req.body.name = name.trim();
  req.body.relationship = relationship || "other";
  req.body.dateOfBirth = parsedDob || undefined;
  req.body.notes = notes ? String(notes).trim() : undefined;
  next();
};

module.exports = {
  assertValidObjectId,
  validateMemberInput,
};
