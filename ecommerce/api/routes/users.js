const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticate } = require('../middleware/auth');
const { authenticateRoles } = require('../middleware/authRoles');


router.post('/register', usersController.registerUser);
router.post('/login', usersController.loginUser);
router.get('/profile', authenticate, usersController.getUserProfile);
router.get('/', authenticate, authenticateRoles('admin', 'staff'), usersController.getAllUsers);
router.get('/:id', authenticate, authenticateRoles('admin', 'staff'), usersController.getUserById);
router.put('/:id', authenticate, authenticateRoles('admin'), usersController.updateUser);
router.delete('/:id', authenticate, authenticateRoles('admin'), usersController.deleteUser);

module.exports = router;
