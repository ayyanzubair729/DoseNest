const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set. Check server/.env (see server/.env.example).");
  }

  const connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 4000,
  });

  console.log(`[dosenest] MongoDB connected: ${connection.connection.host}`);
  return connection;
}

module.exports = connectDB;