module.exports = (err, req, res, next) => {
    console.error("Error:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    res.status(err?.status || 500).json({
        error: err?.message || "Server Error",
    });
};
