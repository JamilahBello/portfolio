const express = require('express');
const router = express.Router();
const invoicesController = require('../controllers/invoicesController');
const { authenticate } = require('../middleware/auth');
const { authenticateRoles } = require('../middleware/authRoles');

router.post('/', authenticate, authenticateRoles('admin', 'staff'), invoicesController.createInvoice);
router.get('/', authenticate, invoicesController.getAllInvoices);
router.get('/:userId', authenticate, invoicesController.getAllInvoicesByUserId);
router.get('/:id', authenticate, invoicesController.getInvoice);
router.get('/:id/pay', authenticate, authenticateRoles('admin', 'staff'), invoicesController.payInvoiceAndOrder);
router.delete('/:id', authenticate, authenticateRoles('admin', 'staff'), invoicesController.deleteInvoice);
