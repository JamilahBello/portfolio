const State = require("../models/State");
const City = require("../models/City");

/**
 * Register a new state
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.registerState = async (req, res, next) => {
    try {
        const { name, code } = req.validated.body;
        const state = new State({ name, code });
        await state.save();

        res.status(201).json({
            message: "State registered successfully",
            state,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Register a new city
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.registerCity = async (req, res, next) => {
    try {
        const { name, stateId } = req.validated.body;
        const city = new City({ name, state: stateId });
        await city.save();

        res.status(201).json({ message: "City registered successfully", city });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Get a list of states
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.getStates = async (req, res, next) => {
    try {
        const { name, code } = req.validated.query;
        const query = {};

        if (name) query.name = name;
        if (code) query.code = code;

        const states = await State.find(query).populate("cities");
        res.status(200).json({ states });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Get a list of cities
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.getCities = async (req, res, next) => {
    try {
        const { name, stateId } = req.validated.query;
        const query = {};

        if (name) query.name = name;
        if (stateId) query.stateId = stateId;

        const cities = await City.find(query).populate("stateId");
        res.status(200).json({ cities });
    } catch (err) {
        console.error(err);
        next(err);
    }
};
