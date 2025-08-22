const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to authenticate user based on JWT token
exports.authenticate = async (req, res, next) => {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null;

    const token = req.cookies?.token || bearer;

    if (!token) {
        return res.status(401).json({ error: "Token not found" });
    }

    try {
        const JWT_SECRET = process.env.JWT_SECRET;

        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET environment variable is not set");
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.deleted) {
            return res.status(401).json({ error: "Invalid token or user" });
        }

        req.user = user; // attach to req
        next();
    } catch (err) {
        console.error(err);
        return res.status(401).json({ error: "Unauthorized" });
    }
};
