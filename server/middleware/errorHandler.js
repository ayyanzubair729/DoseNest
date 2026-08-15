const isDevelopment = process.env.NODE_ENV === "development";

const errorHandler = (err, req, res, _next) => {
  let status = err.status || 500;
  let message = err.message;

  // MongoDB duplicate key (e.g. a race on unique email during registration).
  if (err.code === 11000 && err.keyPattern?.email) {
    status = 409;
    message = "An account with this email already exists.";
  }

  res.status(status).json({
    success: false,
    message: status >= 500 ? "Internal server error" : message,
    ...(isDevelopment && { details: err.message, stack: err.stack }),
  });
};

module.exports = { errorHandler };