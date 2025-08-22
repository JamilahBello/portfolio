exports.authenticateStaff = async (req, res, next) => {
    const token =
        req.cookies.token ||
        (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
        return res.status(401).json({ error: "Token not found" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.deleted || user.type !== "staff") {
            return res.status(403).json({ error: "Forbidden" });
        }

        req.user = user; // attach to req
        next();
    } catch (err) {
        console.error(err);
        return res.status(401).json({ error: "Unauthorized" });
    }
};
