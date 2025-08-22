const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const usersRoutes = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(cookieParser());

// Health check route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// User routes
app.use('/api/v1/users', usersRoutes);

// Product routes
app.use('/api/v1/products', productsRoutes);

// Cart routes
app.use('/api/v1/cart', cartRoutes);

// Order routes
app.use('/api/v1/orders', ordersRoutes);

// Invoice routes
app.use('/api/v1/invoices', invoicesRoutes);

// Inventory routes
app.use('/api/v1/inventory', inventoryRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
