// routes/post.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const Post = require('../models/Post');

// Create a new blog post
router.post('/', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const { title, content } = req.body;

    const newPost = new Post({
      title,
      content,
      author: req.user.userId,
    });

    await newPost.save();

    res.status(201).json({ message: 'Blog post created successfully', post: newPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Retrieve a list of all blog posts with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const posts = await Post.find()
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }); // Sort by creation date in descending order

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Retrieve a specific blog post by ID
router.get('/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Update a blog post (only the owner can perform this operation)
router.put('/:postId', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    if (String(post.author) !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized - You are not the owner of this post' });
    }

    const { title, content } = req.body;

    post.title = title || post.title;
    post.content = content || post.content;

    await post.save();

    res.json({ message: 'Blog post updated successfully', post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Delete a blog post (only the owner can perform this operation)
router.delete('/:postId', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    if (String(post.author) !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized - You are not the owner of this post' });
    }

    await post.remove();

    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Allow users to rate a blog post
router.post('/:postId/rate', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const { rating } = req.body;

    // Check if the user has already rated the post
    const existingRating = post.ratings.find((r) => String(r.userId) === req.user.userId);
    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this post' });
    }

    post.ratings.push({ userId: req.user.userId, rating });
    await post.save();

    res.json({ message: 'Rating added successfully', post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Allow users to comment on a blog post
router.post('/:postId/comment', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const { content } = req.body;

    post.comments.push({ userId: req.user.userId, content });
    await post.save();

    res.json({ message: 'Comment added successfully', post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { keyword, category, author, sortBy, sortOrder } = req.query;

    let query = {};

    // Check if keyword is provided
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } }, // Case-insensitive search in the title
        { content: { $regex: keyword, $options: 'i' } }, // Case-insensitive search in the content
      ];
    }

    // Check if category is provided
    if (category) {
      query.category = category;
    }

    // Check if author is provided
    if (author) {
      const authorUser = await User.findOne({ username: author });

      if (!authorUser) {
        return res.status(404).json({ message: 'Author not found' });
      }

      query.author = authorUser._id;
    }

    // Create the sort object based on provided parameters or use default values
    const sort = {};
    sort[sortBy || 'createdAt'] = sortOrder === 'desc' ? -1 : 1;

    // Perform the search
    const searchResults = await Post.find(query).sort(sort);

    res.json(searchResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Admin: List all blog posts
router.get('/admin/posts', authMiddleware.authenticateUser, authMiddleware.checkRole(['admin']), async (req, res) => {
  try {
    const allPosts = await Post.find()
      .select('title author createdAt ratings')
      .populate('author', 'username'); // Populate author field with username

    res.json(allPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Admin: View a particular blog post
router.get('/admin/posts/:postId', authMiddleware.authenticateUser, authMiddleware.checkRole(['admin']), async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username'); // Populate author field with username

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Admin: Disable a blog
router.put('/admin/disable-blog/:postId', authMiddleware.authenticateUser, authMiddleware.checkRole(['admin']), async (req, res) => {
  try {
    const blogToDisable = await Post.findById(req.params.postId);

    if (!blogToDisable) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    blogToDisable.isDisabled = true;
    await blogToDisable.save();

    res.json({ message: 'Blog disabled successfully', post: blogToDisable });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;