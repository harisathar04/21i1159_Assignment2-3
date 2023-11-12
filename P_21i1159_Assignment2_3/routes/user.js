const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Post = require('../models/Post');
const authMiddleware = require('../middlewares/auth');
const { generateToken, authenticateUser, checkRole } = require('../middlewares/auth');

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new regular user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: 'regular',
    });

    await newUser.save();

    // Generate JWT token for the newly registered user
    const token = generateToken(newUser._id, newUser.role);

    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if the password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token for the logged-in user
    const token = generateToken(user._id, user.role);

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Protected Route Example
router.get('/protected', authenticateUser, checkRole(['admin']), (req, res) => {
  res.json({ message: 'Protected route - Only Admins allowed' });
});

router.post('/follow/:userId', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);

    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user is trying to follow themselves
    if (String(userToFollow._id) === req.user.userId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Check if the user is already following the blogger
    if (req.user.followers.includes(userToFollow._id)) {
      return res.status(400).json({ message: 'You are already following this blogger' });
    }

    req.user.followers.push(userToFollow._id);
    await req.user.save();

    res.json({ message: 'You are now following the blogger', user: req.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get a user's feed with posts from followed bloggers
router.get('/feed', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get posts from followed bloggers
    const posts = await Post.find({ author: { $in: user.followers } })
      .sort({ createdAt: -1 })
      .limit(10); // Limit to 10 posts for demonstration purposes

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get a user's notifications
router.get('/notifications', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get unread notifications
    const unreadNotifications = user.notifications.filter(notification => !notification.seen);

    res.json(unreadNotifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Mark notifications as seen
router.put('/notifications/mark-seen', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark all notifications as seen
    user.notifications.forEach(notification => {
      notification.seen = true;
    });

    await user.save();

    res.json({ message: 'Notifications marked as seen' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Admin: View all users
router.get('/admin/users', authMiddleware.authenticateUser, authMiddleware.checkRole(['admin']), async (req, res) => {
  try {
    const allUsers = await User.find();
    res.json(allUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Admin: Block/Disable a user
router.put('/admin/block-user/:userId', authMiddleware.authenticateUser, authMiddleware.checkRole(['admin']), async (req, res) => {
  try {
    const userToBlock = await User.findById(req.params.userId);

    if (!userToBlock) {
      return res.status(404).json({ message: 'User not found' });
    }

    userToBlock.isBlocked = true;
    await userToBlock.save();

    res.json({ message: 'User blocked successfully', user: userToBlock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
