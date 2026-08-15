const mongoose = require("mongoose");

const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    service: "dosenest-api",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
};

module.exports = { getHealth };