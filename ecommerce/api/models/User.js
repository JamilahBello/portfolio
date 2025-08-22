const mongoose = require('mongoose');
const bcrypt = require('bcrypt');const City = require('./City');
const State = require('./State');
;

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstname: { type: String },
  lastname: { type: String },
  businessName: { type: String },
  phone: { type: String, required: true, unique: true },
  addresses: { type: [{
    street: String,
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    state: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
  }], default: [] },
  type: { type: String, enum: ['admin', 'customer', 'business', 'staff'], default: 'customer' },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }
});

// Pre-save middleware for password hashing
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.isDeleted = function () {
  return this.deletedAt !== null;
};

UserSchema.statics.findNonDeleted = function () {
  return this.find({ deleted: false });
};

UserSchema.statics.softDelete = function (userId) {
  return this.findByIdAndUpdate(userId, { deleted: true, deletedAt: Date.now() }, { new: true });
};

UserSchema.statics.restore = function (userId) {
  return this.findByIdAndUpdate(userId, { deleted: false, deletedAt: null }, { new: true });
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
    deletedAt: this.deletedAt
  };
};

// Ensure the schema is indexed for better performance
UserSchema.index({ email: 1, phone: 1 });

// Add timestamps for createdAt and updatedAt
UserSchema.set('timestamps', true); // Automatically manage createdAt and updatedAt fields

module.exports = mongoose.model('User', UserSchema);
