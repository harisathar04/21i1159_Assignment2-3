// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  isBlocked: {
    type: Boolean,
    default: false,
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  notifications: [{
    type: { type: String, enum: ['follow', 'comment'] },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    seen: {
      type: Boolean,
      default: false,
    },
  }],
});

const User = mongoose.model('User', userSchema);

module.exports = User;
