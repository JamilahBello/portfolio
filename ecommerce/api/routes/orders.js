const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const { authenticate } = require('../middleware/auth');
const { authenticateRoles } = require('../middleware/authRoles');

router.post('/', authenticate, ordersController.createOrder);
router.get('/', authenticate, ordersController.getAllOrders);
router.get('/:userId', authenticate, ordersController.getAllOrdersByUserId);
router.get('/:id', authenticate, ordersController.getOrder);
router.put('/:id', authenticate, authenticateRoles('admin', 'staff'), ordersController.updateOrder);
router.delete('/:id', authenticate, authenticateRoles('admin', 'staff'), ordersController.deleteOrder);
