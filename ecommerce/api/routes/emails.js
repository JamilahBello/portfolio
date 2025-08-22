const express = require('express');
const router = express.Router();
const emailsController = require('../controllers/emailsController');
const { authenticate } = require('../middleware/auth');
const { authenticateRoles } = require('../middleware/authRoles');

router.post('/create', authenticate, authenticateRoles('admin'), emailsController.createEmail);
router.post('/send/bulk', emailsController.sendEmails);
