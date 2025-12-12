const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  role: { type: String, required: true },        // Employee, HOD, Admin, SuperAdmin
  department: { type: String, required: true },  // NEWS Uncut, Swarang, etc.
  name: { type: String, required: true },
  email: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

module.exports = mongoose.model('User', UserSchema);
