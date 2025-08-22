const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const usersRoutes = require("./routes/users");
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const invoicesRoutes = require("./routes/invoices");
const geographiesRoutes = require("./routes/geographies");
const emailsRoutes = require("./routes/emails");
const categoriesRoutes = require("./routes/categories");
const cartsRoutes = require("./routes/carts");
const errorHandler = require("./middleware/errorHandler");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));
app.use(cookieParser());

// Health check route
app.get("/api/v1/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "API is running" });
});

// User routes
app.use("/api/v1/users", usersRoutes);

// Product routes
app.use("/api/v1/products", productsRoutes);

// Order routes
app.use("/api/v1/orders", ordersRoutes);

// Invoice routes
app.use("/api/v1/invoices", invoicesRoutes);

// Geography routes
app.use("/api/v1/geographies", geographiesRoutes);

// Email routes
app.use("/api/v1/emails", emailsRoutes);

// Category routes
app.use("/api/v1/categories", categoriesRoutes);

// Cart routes
app.use("/api/v1/carts", cartsRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
