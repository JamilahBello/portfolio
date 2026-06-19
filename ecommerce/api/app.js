const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const usersRoutes = require('./routes/users');
const productsRoutes = require('./routes/products');
const cartRoutes = require('./routes/carts');
const ordersRoutes = require('./routes/orders');
const invoicesRoutes = require('./routes/invoices');
const categoriesRoutes = require('./routes/categories');
const geographiesRoutes = require('./routes/geographies');
const emailsRoutes = require('./routes/emails');
const notFound = require("./middleware/notFound");

const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));
app.use(cookieParser());

app.get("/", (req, res) => {
    res.status(200).json({
        message: "Ecommerce API",
        health: "api/v1/health",
    });
});

// Health check route
app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "API is running",
    });
});

app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/carts', cartRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/geographies', geographiesRoutes);
app.use('/api/v1/emails', emailsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
