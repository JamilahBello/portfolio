const mongoose = require('mongoose');
const { optional } = require('zod');

const StateSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    capital: { type: String, default: '' },
    cities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City' }],
    createdAt: { type: Date, default: Date.now },
});

// Add timestamps for createdAt and updatedAt
StateSchema.set('timestamps', true);

StateSchema.virtual('population').get(async function () {
  const User = mongoose.model('User');
  return await User.countDocuments({ 'addresses.state': this._id, deleted: false });
});

// Method to get state details
StateSchema.methods.getDetails = function() {
    return {
        id: this._id,
        name: this.name,
        code: this.code,
        cities: this.cities,
        capital: this.capital,
        createdAt: this.createdAt
    };
};

// Ensure the schema is indexed for better performance
StateSchema.index({ name: 'text', code: 'text' });
StateSchema.index({ code: 1 });
StateSchema.index({ name: 1 });

// Static method to find all states
StateSchema.statics.findAll = function() {
    return this.find({});
};

// Static method to find a state by code
StateSchema.statics.findByCode = function(code) {
    return this.findOne({ code });
};

// Static method to find a state by name
StateSchema.statics.findByName = function(name) {
    return this.findOne({ name });
};

// Static method to create a new state
StateSchema.statics.createState = function(stateData) {
    const state = new this(stateData);
    return state.save();
};

module.exports = mongoose.model('State', StateSchema);
