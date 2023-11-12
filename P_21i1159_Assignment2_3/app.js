// app.js
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/user');
const postRoutes = require('./routes/post');

const app = express();
const port = 3000;

mongoose.connect('mongodb://localhost/blog_platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.json());
app.use('/user', userRoutes);
app.use('/post', postRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
