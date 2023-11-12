const jwt = require('jsonwebtoken');
const { checkRole } = require('./auth'); // Import the role-checking middleware

const generateToken = (userId, role) => {
  // Generate a JWT token with the user ID and role
  return jwt.sign({ userId, role }, 'secret_key', { expiresIn: '1h' }); // Token expires in 1 hour
};

const authenticateUser = (req, res, next) => {
  // Check if the request has a valid JWT token
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - Missing token' });
  }

  jwt.verify(token, 'secret_key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }

    req.user = decoded;
    next();
  });
};

module.exports = { generateToken, authenticateUser, checkRole };
