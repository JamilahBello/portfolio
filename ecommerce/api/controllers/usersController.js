const User = require("../models/User");
const { sanitizeUser } = require("../utils/formatters");
const { generateToken } = require("../utils/jwt");
const { createEmailService } = require("./emailsController");
const { setAuthCookie } = require("../utils/cookies");

/**
 * Users Controller
 *
 * Responsibilities:
 * - Manage user lifecycle: registration, authentication (login/logout), password reset initiation.
 * - Provide user retrieval (list / single) and updates.
 * - Soft-delete (deactivate) user accounts.
 *
 * Assumptions:
 * - Authentication middleware attaches req.user: { id: string(ObjectId), type: "customer" | "admin" | "staff" | ... } for
 *   routes that require it (login/register may not have req.user).
 * - Validation middleware populates:
 *     req.validated.body
 *     req.validated.params
 *     req.validated.query
 * - User model exposes:
 *     - comparePassword(plain: string) => Promise<boolean>
 *     - generatePasswordResetToken() => string (and sets token + expiry on the user document)
 *   and uses a pre-save hook for password hashing (implied).
 * - Email sending performed by createEmailService({ to, subject, body }).
 * - generateToken(user) returns a signed JWT; setAuthCookie(res, token) stores it (e.g., HttpOnly cookie).
 *
 * Common HTTP Status Codes:
 * - 200 OK              Successful read / login / logout / update / deletion (soft)
 * - 201 Created         Successful registration
 * - 400 Bad Request     (Not explicitly thrown here; could be used for validation failures)
 * - 401 Unauthorized    Invalid credentials (login)
 * - 403 Forbidden       Accessing another user's data without sufficient role
 * - 404 Not Found       User not found (lookup / password reset)
 * - 409 Conflict        Email already registered
 * - 500 Internal Server Error (unexpected; forwarded to global handler)
 *
 * Notes:
 * - Registration currently returns only a message (not the user or token). Adjust if you want immediate login.
 * - forgotPassword returns 404 when user absent (reveals account existence). For better privacy, consider always returning 200.
 */

/**
 * Register a new user.
 *
 * Workflow:
 * 1. Extract validated fields from request body.
 * 2. Check for existing email (case-sensitive as written; consider normalizing to lowercase).
 * 3. Create and save the user (password hashed by model hooks).
 * 4. Send welcome email.
 *
 * Request Body (validated):
 * {
 *   email: string,
 *   password: string,
 *   firstname?: string,
 *   lastname?: string,
 *   phone?: string,
 *   type?: string   // role; ensure restricted in validation (e.g., only admins can set elevated roles)
 * }
 *
 * Success (201):
 * {
 *   message: "User registered successfully"
 * }
 *
 * Error Responses:
 * - 409 Email already registered
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next  Express next
 * @returns {Promise<void>}
 */
exports.registerUser = async (req, res, next) => {
    try {
        const { email, password, firstname, lastname, phone, type } = req.validated.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({ error: "Email already registered" });
        }

        const user = new User({
            email,
            password,
            firstname,
            lastname,
            phone,
            type,
        });

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
 * Authenticate (login) a user.
 *
 * Workflow:
 * 1. Locate user by email.
 * 2. Compare password using model method comparePassword.
 * 3. Generate JWT and set auth cookie.
 * 4. Return sanitized user object.
 *
 * Request Body (validated):
 * {
 *   email: string,
 *   password: string
 * }
 *
 * Success (200):
 * {
 *   message: "Login successful",
 *   user: { id, email, firstname?, lastname?, type, ... }  // sanitized
 * }
 *
 * Error Responses:
 * - 401 Email or password is incorrect
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.validated.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: "Email or password is incorrect" });
        }

        const token = generateToken(user);
        setAuthCookie(res, token);

        res.status(200).json({ message: "Login successful", user: sanitizeUser(user) });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Logout a user (invalidate session on client by clearing auth cookie).
 *
 * Workflow:
 * 1. Clear authentication cookie (name: "token").
 * 2. Respond with confirmation.
 *
 * Success (200):
 * {
 *   message: "Logout successful"
 * }
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
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
 * Initiate password reset (forgot password).
 *
 * Workflow:
 * 1. Find user by email.
 * 2. Generate password reset token via user.generatePasswordResetToken().
 * 3. Persist token/expiry to user record.
 * 4. Email reset link containing token.
 *
 * Security Consideration:
 * - Current implementation returns 404 when user is not found (reveals existence).
 *   For better privacy, consider always returning 200 with a generic message.
 *
 * Request Body (validated):
 * {
 *   email: string
 * }
 *
 * Success (200):
 * {
 *   message: "Password reset email sent"
 * }
 *
 * Error Responses:
 * - 404 User not found
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.validated.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

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
};

/**
 * Retrieve a list of users (filtered).
 *
 * Query Parameters (validated, all optional):
 * - id?: string(ObjectId)        Exact user id
 * - email?: string               Case-insensitive partial email match
 * - firstname?: string           Case-insensitive partial first name
 * - lastname?: string            Case-insensitive partial last name
 * - phone?: string               Case-insensitive partial phone
 * - name?: string                Matches firstname, lastname, or "firstname lastname" concat
 *
 * Behavior:
 * - Builds dynamic query with optional $or clause for name composite search.
 * - Returns sanitized user objects.
 * - No pagination implemented (add if user base is large).
 * - Authorization not enforced here (assumed externally or adjust as needed).
 *
 * Success (200):
 * {
 *   users: [ { ...sanitizedUser }, ... ]
 * }
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getUsers = async (req, res, next) => {
    try {
        const { firstname, lastname, id, email, name, phone } = req.validated.query;
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
                            input: { $concat: ["$firstname", " ", "$lastname"] },
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
 * Retrieve a single user by ID.
 *
 * Authorization:
 * - User can access own record.
 * - Admin/staff can access any user.
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Success (200):
 * {
 *   user: { ...sanitizedUser }
 * }
 *
 * Error Responses:
 * - 403 Forbidden (not owner and insufficient role)
 * - 404 User not found
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
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
 * Update a user (partial update).
 *
 * Authorization:
 * - Typically a user can update their own profile.
 * - Admin/staff can update others (enforce externally or add checks here).
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Request Body (validated):
 * - Any subset of allowed fields (e.g., firstname, lastname, phone, type?). Enforce role restrictions for 'type'.
 *
 * Success (200):
 * {
 *   message: "User updated successfully",
 *   user: { ...sanitizedUpdatedUser }
 * }
 *
 * Error Responses:
 * - 404 User not found
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
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
 * Soft-delete (deactivate) a user.
 *
 * Workflow:
 * 1. Locate user by id.
 * 2. Set deleted flag (assumes 'deleted' boolean exists on model).
 * 3. Save changes.
 * 4. Send deletion notification email.
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Success (200):
 * {
 *   message: "User deleted successfully"
 * }
 *
 * Error Responses:
 * - 404 User not found
 *
 * NOTE:
 * - If hard deletion is required, replace logic with findByIdAndDelete.
 * - Ensure that 'deleted' is filtered in queries elsewhere (not shown here).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
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
            body: `Hello ${user.firstname ?? user.email}, your account has been deleted.`,
        });

        res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};