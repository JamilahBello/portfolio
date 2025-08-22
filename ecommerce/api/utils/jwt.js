const jwt = require("jsonwebtoken");

exports.generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, type: user.type },
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
    );
};
