const User = require("../models/User");
const { sanitizeUser } = require("../utils/formatters");
const { generateToken } = require("../utils/jwt");
const { createEmailService } = require("./emailsController");
const { setAuthCookie } = require("../utils/cookies");

/**
 * Register a new user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.registerUser = async (req, res, next) => {
    try {
        const { email, password, firstname, lastname, phone, type } =
            req.validated.body;

        const user = new User({
            email,
            password,
            firstname,
            lastname,
            phone,
            type,
        });

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({ error: "Email already registered" });
        }

        await user.save();
        await createEmailService({
            to: user.email,
            subject: "Welcome to Our Service",
            body: `Hello ${user.firstname ?? user.email}, welcome to our service!`,
        });

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Login a user
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns user
 */
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.validated.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            return res
                .status(401)
                .json({ error: "Email or password is incorrect" });
        }

        const token = generateToken(user);
        setAuthCookie(res, token);

        return res
            .status(200)
            .json({ message: "Login successful", user: sanitizeUser(user) });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Logout a user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
exports.logoutUser = async (req, res, next) => {
    try {
        res.clearCookie("token");
        res.status(200).json({ message: "Logout successful" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Handle forgot password request
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.validated.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Generate a password reset token and send it via email
        const token = user.generatePasswordResetToken();
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        await createEmailService({
            to: user.email,
            subject: "Password Reset",
            body: `Click the link to reset your password: ${resetLink}`,
        });

        res.status(200).json({ message: "Password reset email sent" });
    } catch (err) {
        console.error(err);
        next(err);
    }

    sendPasswordResetEmail = (email, token) => {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        const message = `Click the link to reset your password: ${resetLink}`;

        return createEmailService({
            to: email,
            subject: "Password Reset",
            body: message,
        });
    };
};

/**
 * Get a list of users
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
exports.getUsers = async (req, res, next) => {
    try {
        const { firstname, lastname, id, email, name, phone } =
            req.validated.query;
        const query = {};

        if (id) query._id = id;
        if (email) query.email = { $regex: email, $options: "i" };
        if (firstname) query.firstname = { $regex: firstname, $options: "i" };
        if (lastname) query.lastname = { $regex: lastname, $options: "i" };
        if (phone) query.phone = { $regex: phone, $options: "i" };
        if (name) {
            query.$or = [
                { firstname: { $regex: name, $options: "i" } },
                { lastname: { $regex: name, $options: "i" } },
                {
                    $expr: {
                        $regexMatch: {
                            input: {
                                $concat: ["$firstname", " ", "$lastname"],
                            },
                            regex: name,
                            options: "i",
                        },
                    },
                },
            ];
        }

        const users = await User.find(query);
        res.status(200).json({ users: users.map(sanitizeUser) });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Get a user by ID
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
exports.getUser = async (req, res, next) => {
    try {
        const { id } = req.validated.params;

        if (id !== req.user.id && !["admin", "staff"].includes(req.user.type)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ user: sanitizeUser(user) });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Update a user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
exports.updateUser = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const updates = req.validated.body;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true },
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({
            message: "User updated successfully",
            user: sanitizeUser(updatedUser),
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Delete a user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
exports.deleteUser = async (req, res, next) => {
    try {
        const { id } = req.validated.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.deleted = true;
        await user.save();
        await createEmailService({
            to: user.email,
            subject: "Account Deletion",
            body: `Hello ${user.firstname}, your account has been deleted.`,
        });

        res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};
