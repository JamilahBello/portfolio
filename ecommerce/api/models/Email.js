const mongoose = require('mongoose');
const { email } = require('zod');

const EmailSchema = new mongoose.Schema({
    to: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
    }
});

EmailSchema.pre('save', function(next) {
    if (!this.isModified('to') || !this.isModified('subject') || !this.isModified('body')) {
        return next();
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.to)) {
        return next(new Error('Invalid email format'));
    }

    next();
});

EmailSchema.methods.markAsSent = function() {
    this.status = 'sent';
    this.sentAt = Date.now();
    return this.save();
};

EmailSchema.methods.markAsFailed = function() {
    this.status = 'failed';
    return this.save();
};

EmailSchema.statics.findById = function(id) {
    return this.findOne({ _id: id });
};

EmailSchema.methods.generatePasswordResetToken = function() {
    // Implementation for generating a password reset token
    const token = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = token;
    this.passwordResetExpires = Date.now() + 3600000; // 1 hour
    return token;
};

EmailSchema.methods.findOneRecentPending = function() {
    return this.findOne({ status: 'pending' }).sort({ createdAt: -1 });
};

EmailSchema.methods.getDetails = function() {
    return {
        id: this._id,
        to: this.to,
        subject: this.subject,
        body: this.body,
        sentAt: this.sentAt,
        status: this.status
    };
};

EmailSchema.methods.markAsPending = function() {
    this.status = 'pending';
    this.sentAt = null;
    return this.save();
};

EmailSchema.methods.deleteEmail = function() {
    return this.remove();
};

EmailSchema.statics.findByEmail = function(email) {
    return this.findOne({ to: email });
};

EmailSchema.statics.findAllSentEmails = function() {
    return this.find({ status: 'sent' });
};

EmailSchema.statics.findAllFailedEmails = function() {
    return this.find({ status: 'failed' });
};

EmailSchema.statics.findAllEmails = function() {
    return this.find({});
};

module.exports = mongoose.model('Email', EmailSchema);