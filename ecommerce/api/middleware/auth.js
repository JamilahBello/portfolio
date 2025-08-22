const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Authentication Middleware
 *
 * Responsibilities:
 * - Authenticate incoming HTTP requests using a JWT provided either:
 *     1) In the Authorization header as a Bearer token, or
 *     2) In a cookie named "token".
 * - Attach the authenticated user document to req.user when valid.
 * - Reject requests with appropriate 401 responses when authentication fails.
 *
 * Assumptions:
 * - JWT secret key is supplied via process.env.JWT_SECRET.
 * - Tokens were signed with payload containing at least an 'id' field
 *   (e.g., jwt.sign({ id: user._id, ... }, JWT_SECRET, { ... })).
 *   If your project uses a different claim (e.g. 'sub'), adjust the lookup accordingly.
 * - User model includes a 'deleted' (boolean) flag for soft deletion. Deleted users are treated as invalid.
 * - Downstream handlers rely on presence of req.user for authorization decisions.
 *
 * Common HTTP Status Codes:
 * - 200 OK    (Not directly returned here; success flows into next middleware/handler)
 * - 401 Unauthorized (missing token, invalid signature, user not found, soft-deleted user, or other verification issues)
 *
 * Security Notes:
 * - Consider rotating JWT secrets and handling token invalidation (e.g., a token blacklist) if needed.
 * - If tokens are long-lived, enforce additional checks (e.g., passwordChangedAt timestamps).
 * - For heightened security, ensure cookies are set with HttpOnly, Secure, SameSite flags when using cookie transport.
 *
 * Error Handling:
 * - On any failure, responds with a generic 401 and error message to avoid leaking sensitive details.
 *
 * @param {import('express').Request} req  Express request object
 * @param {import('express').Response} res  Express response object
 * @param {import('express').NextFunction} next Next middleware function
 * @returns {Promise<void>}
 */
exports.authenticate = async (req, res, next) => {
    // Extract Bearer token if present
    const bearer = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null;

    // Prefer cookie token if set, otherwise fallback to Authorization header
    const token = req.cookies?.token || bearer;

    if (!token) {
        return res.status(401).json({ error: "Token not found" });
    }

    try {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            // Treat missing secret as server misconfiguration but respond as unauthorized to client
            throw new Error("JWT_SECRET environment variable is not set");
        }

        // Verify and decode token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Lookup user by decoded.id (adjust to decoded.sub if your token uses 'sub')
        const user = await User.findById(decoded.id);
        if (!user || user.deleted) {
            return res.status(401).json({ error: "Invalid token or user" });
        }

        // Attach user to request object for downstream use
        req.user = user;
        next();
    } catch (err) {
        console.error(err);
        return res.status(401).json({ error: "Unauthorized" });
    }
};