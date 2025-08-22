const express = require('express');
const router = express.Router();
const geographiesController = require('../controllers/geographiesController');
const { authenticate } = require('../middleware/auth');
const { authenticateRoles } = require('../middleware/authRoles');

router.post('/state', authenticate, authenticateRoles('admin', 'staff'), geographiesController.registerState);
router.post('/city', authenticate, authenticateRoles('admin', 'staff'), geographiesController.registerCity);
router.get('/state', authenticate, geographiesController.getAllStates);
router.get('/city', authenticate, geographiesController.getAllCities);
router.get('/state/:id/cities', authenticate, geographiesController.getCitiesByState);
