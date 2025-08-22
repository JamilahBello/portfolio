const State = require('../models/State');
const City = require('../models/City');

exports.registerState = async (req, res, next) => {
  try {
    const { name, country } = req.body;
    const state = new State({ name, country });
    await state.save();
    res.status(201).json({ message: 'State registered successfully', state });
  } catch (err) {
    next(err);
  }
};

exports.registerCity = async (req, res, next) => {
  try {
    const { name, state } = req.body;
    const city = new City({ name, state });
    await city.save();
    res.status(201).json({ message: 'City registered successfully', city });
  } catch (err) {
    next(err);
  }
};

exports.getAllStates = async (req, res, next) => {
  try {
    const states = await State.find().populate('cities');
    res.status(200).json({ states });
  } catch (err) {
    next(err);
  }
};

exports.getAllCities = async (req, res, next) => {
  try {
    const cities = await City.find().populate('state');
    res.status(200).json({ cities });
  } catch (err) {
    next(err);
  }
};

exports.getCitiesByState = async (req, res, next) => {
  try {
    const { stateId } = req.params;
    const cities = await City.find({ state: stateId });
    res.status(200).json({ cities });
  } catch (err) {
    next(err);
  }
};
