const mongoose = require('mongoose');
const User = require('./User');
const State = require('./State');

const CitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true },
    postalCode: { type: String, required: true },
    coordinates: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true }
    },
    createdAt: { type: Date, default: Date.now },
});

// Ensure the coordinates are indexed for geospatial queries
CitySchema.index({ coordinates: '2dsphere' }); 

// Add timestamps for createdAt and updatedAt
CitySchema.set('timestamps', true);

// Add a method to get the city details
CitySchema.methods.getDetails = function() {
    return {
        id: this._id,
        name: this.name,
        code: this.code,
        state: this.state,
        postalCode: this.postalCode,
        coordinates: this.coordinates,
        createdAt: this.createdAt,
    };
}

CitySchema.virtual('population').get(async function () {
  const User = mongoose.model('User');
  return await User.countDocuments({ 'addresses.city': this._id, deleted: false });
});

// Static method to find all cities
CitySchema.statics.findAll = function() {
    return this.find({});
};

// Static method to find a city by code
CitySchema.statics.findByCode = function(code) {
    return this.findOne({ code });
};

// Static method to find a city by name
CitySchema.statics.findByName = function(name) {
    return this.findOne({ name });
};

// Static method to find cities by state
CitySchema.statics.findByState = function(stateId) {
    return this.find({ state: stateId });
};  

// Static method to create a new city
CitySchema.statics.createCity = function(cityData) {
    const city = new this(cityData);
    return city.save();
};

module.exports = mongoose.model('City', CitySchema);
