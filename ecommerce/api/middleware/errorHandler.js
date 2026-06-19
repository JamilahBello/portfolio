const { ZodError } = require("zod");
const mongoose = require("mongoose");

const formatZodErrors = (issues = []) =>
    issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
    }));

const formatMongooseValidationErrors = (error) =>
    Object.values(error.errors || {}).map((err) => ({
        field: err.path,
        message: err.message,
    }));


/**
 * Express error handling middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || "Internal server error";
    let errors = err.errors || [];

    if (err instanceof ZodError) {
        statusCode = 400;
        message = "Validation failed";
        errors = formatZodErrors(err.issues);
    }

    if (err instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        message = "Database validation failed";
        errors = formatMongooseValidationErrors(err);
    }

    if (err instanceof mongoose.Error.CastError) {
        statusCode = 400;
        message = `Invalid ${err.path}`;
        errors = [
            {
                field: err.path,
                message: `Invalid value: ${err.value}`,
            },
        ];
    }

    if (err.code === 11000) {
        statusCode = 409;
        message = "Duplicate value already exists";
        errors = Object.keys(err.keyValue || {}).map((field) => ({
            field,
            message: `${field} already exists`,
        }));
    }

    if (statusCode >= 500) {
        console.error("Unhandled error:", err);
    }

    res.status(statusCode).json({
        success: false,
        message:
            process.env.NODE_ENV === "production" && statusCode >= 500
                ? "Internal server error"
                : message,
        errors,
    });
};

module.exports = errorHandler;