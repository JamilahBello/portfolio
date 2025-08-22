const User = require('../models/User');
const { sanitizeUser } = require('../utils/formatters');
const { validateUserLoginInput } = require('../utils/validators');
const { generateToken } = require('../utils/jwt');
const { createEmail } = require('./emailsController');

exports.registerUser = async (req, res, next) => {
  try {
    const { email, password, firstname, lastname, phone, type } = req.body;

    const user = new User({ email, password, firstname, lastname, phone, type });

    const { isValid, errors } = validateUserLoginInput(user);
    if (!isValid) {
      return res.status(400).json({ errors });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    await user.save();
    await sendEmail({
      to: user.email,
      subject: 'Welcome to Our Service',
      text: `Hello ${user.firstname}, welcome to our service!`
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    next(err);
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Email or password is incorrect' });
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: process.env.SESSION_COOKIE_HTTP_ONLY,
      secure: process.env.SESSION_COOKIE_SECURE,
      sameSite: process.env.SESSION_COOKIE_SAME_SITE,
      maxAge: process.env.SESSION_COOKIE_MAX_AGE,
    });
    res.setHeader('Authorization', `Bearer ${token}`);
    res.status(200).json({ message: 'Login successful', user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.logoutUser = async (req, res, next) => {
  try {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate a password reset token and send it via email
    const token = user.generatePasswordResetToken();
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset',
      text: `Click the link to reset your password: ${resetLink}`
    });

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (err) {
    next(err);
  }

  sendPasswordResetEmail = (email, token) => {
    // Implementation for sending email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const message = `Click the link to reset your password: ${resetLink}`;

    return sendEmail({
      to: email,
      subject: 'Password Reset',
      text: message,
    });
  };
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json({ users: users.map(sanitizeUser) });
  } catch (err) {
    next(err);
  }
}

exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id; // From the auth middleware
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Optional: Only allow user to update certain fields
    const updates = (({ firstname, lastname, phone, type, email, addresses }) => ({ firstname, lastname, phone, type, email, addresses }))(req.body);

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully', user: sanitizeUser(updatedUser) });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.deleted = true;
    await user.save();
    await createEmail({
      to: user.email,
      subject: 'Account Deletion',
      text: `Hello ${user.firstname}, your account has been deleted.`
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};


