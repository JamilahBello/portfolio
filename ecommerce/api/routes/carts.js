const express = require('express');
const router = express.Router();
const cartsController = require('../controllers/cartsController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, cartsController.createCart);
router.get('/', authenticate, cartsController.getCart);
router.delete('/', authenticate, cartsController.clearCart);
router.put('/', authenticate, cartsController.updateCartItem);
router.delete('/remove', authenticate, cartsController.deleteCartItem);
