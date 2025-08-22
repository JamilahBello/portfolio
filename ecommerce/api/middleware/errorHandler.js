/**
 * Global Error Handling Middleware
 *
 * Responsibilities:
 * - Centralize formatting of all application errors into a consistent JSON response.
 * - Log error message and stack trace (when available) to stderr/console for diagnostics.
 * - Prevent leaking internal details by default (only exposes err.message).
 *
 * Assumptions:
 * - Placed AFTER all route handlers and other middleware: app.use(errorHandler).
 * - Errors are passed via next(err) where err can be:
 *     - An Error instance (preferred)
 *     - A custom error object that may include: { status, message, ... }
 * - Upstream code may set err.status (HTTP status code). If absent, defaults to 500.
 *
 * Response Shape:
 * {
 *   "error": string   // human-readable error message
 * }
 *
 * Common Status Codes (depends on upstream throwers):
 * - 400 Bad Request          Validation / malformed input
 * - 401 Unauthorized         Authentication failure
 * - 403 Forbidden            Authorization failure
 * - 404 Not Found            Missing resource
 * - 409 Conflict             Uniqueness / state conflict
 * - 422 Unprocessable Entity Semantic validation issues
 * - 500 Internal Server Error Unhandled / unexpected error (default)
 *
 * Security Notes:
 * - Stack trace is NOT sent to the client—only logged server-side.
 * - If you need environment-specific verbosity, extend to include stack in non-production.
 *
 * Extension Ideas:
 * - Map known error types (e.g., ZodError, MongooseValidationError) to structured responses.
 * - Add a correlation / request ID for tracing (e.g., from req.id).
 * - Support an `errors` array for field-level validation feedback.
 *
 * Usage:
 *   const errorHandler = require('./errorHandlerMiddleware');
 *   app.use(errorHandler);
 *
 * @param {import('express').ErrorRequestHandler} err   Error object
 * @param {import('express').Request} req               Express request
 * @param {import('express').Response} res              Express response
 * @param {import('express').NextFunction} next         Next middleware (unused here)
 */
module.exports = (err, req, res, next) => {
    // Basic logging (synchronous; replace with logger integration if desired)
    console.error("Error:", err?.message || err);
    if (err?.stack) console.error(err.stack);

    // Respect existing response state if headers already sent
    if (res.headersSent) {
        return next(err);
    }

    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;

    res.status(status).json({
        error: err?.message || "Server Error",
    });
};