const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const { authenticate } = require('../middleware/auth');
const { authenticateRoles } = require('../middleware/authRoles');

router.post('/', authenticate, authenticateRoles('admin'), productsController.createProduct);
router.get('/', productsController.getAllProducts);
router.get('/:id', productsController.getProductById);
router.get('/:category', productsController.getProductByCategory);
router.put('/:id/stock', authenticate, authenticateRoles('admin', 'staff'), productsController.updateProductStock);
router.post('/:id/images', authenticate, authenticateRoles('admin', 'staff'), productsController.addProductImage);
router.put('/:id/images', authenticate, authenticateRoles('admin', 'staff'), productsController.updateProductImages);
router.put('/:id', authenticate, authenticateRoles('admin'), productsController.updateProduct);
router.delete('/:id', authenticate, authenticateRoles('admin'), productsController.deleteProduct);

module.exports = router;
