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
