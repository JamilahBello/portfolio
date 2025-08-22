const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstname: { type: String },
    lastname: { type: String },
    businessName: { type: String },
    phone: { type: String, required: true, unique: true },
    addresses: {
        type: [
            {
                street: String,
                city: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
                state: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
            },
        ],
        default: [],
    },
    type: {
        type: String,
        enum: ["admin", "customer", "business", "staff"],
        default: "customer",
    },
    deleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
});

// Pre-save middleware for password hashing
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        return next();
    } catch (err) {
        return next(err);
    }
});

UserSchema.methods.generatePasswordResetToken = function () {
    // Implementation for generating a password reset token
    const token = crypto.randomBytes(32).toString("hex");
    this.passwordResetToken = token;
    this.passwordResetExpires = Date.now() + 3600000; // 1 hour
    return token;
};

UserSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.statics.findNonDeleted = function () {
    return this.find({ deleted: false });
};

UserSchema.virtual('isDeleted').get(function () {
    return this.deletedAt !== null;
});

UserSchema.methods.softDelete = async function () {
    if (!this.deletedAt) {
      this.deletedAt = new Date();
      await this.save();
    }
    return this;
};

UserSchema.statics.restore = function (userId) {
    return this.findByIdAndUpdate(
        userId,
        { deleted: false, deletedAt: null },
        { new: true },
    );
};

UserSchema.methods.getDetails = function () {
    return {
        id: this._id,
        email: this.email,
        firstname: this.firstname,
        lastname: this.lastname,
        businessName: this.businessName,
        phone: this.phone,
        addresses: this.addresses,
        type: this.type,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        deletedAt: this.deletedAt,
    };
};

// Add timestamps for createdAt and updatedAt
UserSchema.set("timestamps", true); // Automatically manage createdAt and updatedAt fields

module.exports = mongoose.model("User", UserSchema);
