const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

async function fixAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const users = await User.find({ deletedAt: null });
    console.log(`Found ${users.length} users to update.`);

    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash("password123", salt);

    // Update ALL users at once
    const result = await User.updateMany(
      { deletedAt: null }, 
      { $set: { password: newHashedPassword } }
    );

    console.log(`✅ SUCCESS: ${result.modifiedCount} users updated.`);
    console.log(`🔑 All users can now log in with password: password123`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.connection.close();
    process.exit();
  }
}

fixAllUsers();