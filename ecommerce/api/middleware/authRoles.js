/**
 * Role Authorization Middleware Factory
 *
 * Responsibilities:
 * - Generate an Express middleware that authorizes requests based on the
 *   authenticated user's role (stored at req.user.type).
 * - Enforce that only users whose role is in the allowedRoles list proceed.
 *
 * Assumptions:
 * - An authentication middleware has already:
 *     1. Validated the incoming token/session.
 *     2. Attached a user object to req.user with at least a 'type' property
 *        (e.g., { id: "...", type: "admin" }).
 * - Role values in your system are consistent strings (e.g., "admin", "staff", "customer").
 *
 * Behavior:
 * - If req.user is missing or req.user.type is not in allowedRoles,
 *   responds with 403 Forbidden:
 *     { error: "Forbidden: insufficient privileges" }
 * - Otherwise calls next().
 *
 * Common HTTP Status Codes:
 * - 200 OK    (Not directly returned; downstream handlers execute)
 * - 403 Forbidden  User role not permitted
 *
 * Security Notes:
 * - This middleware does not authenticate—only authorizes. Always pair with an authentication
 *   layer (e.g., authenticate) earlier in the middleware chain.
 * - To avoid accidental open access, ensure it is never used before authentication.
 *
 * Example:
 *   const { authenticate } = require("./authMiddleware");
 *   const { authenticateRoles } = require("./authorizeRolesMiddleware");
 *
 *   app.post(
 *     "/admin/task",
 *     authenticate,
 *     authenticateRoles("admin", "staff"),
 *     controller.performAdminTask
 *   );
 *
 * @param {...string} allowedRoles List of role identifiers permitted to access the route.
 * @returns {import('express').RequestHandler} Express middleware enforcing role-based authorization.
 */
exports.authenticateRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.type;
        if (!allowedRoles.includes(userRole)) {
            return res
                .status(403)
                .json({ error: "Forbidden: insufficient privileges" });
        }
        next();
    };
};