const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const { authenticate } = require('../middleware/auth');
const { authenticateRoles } = require('../middleware/authRoles');

router.post('/', authenticate, authenticateRoles('admin', 'staff'), categoriesController.addCategory);
router.get('/', categoriesController.getAllCategories);
router.get('/:id', categoriesController.getCategoryById);
router.put('/:id', authenticate, authenticateRoles('admin', 'staff'), categoriesController.updateCategory);
router.delete('/:id', authenticate, authenticateRoles('admin', 'staff'), categoriesController.deleteCategory);
