const State = require("../models/State");
const City = require("../models/City");

/**
 * Locations Controller
 *
 * Responsibilities:
 * - Manage hierarchical geographic entities: States and Cities.
 * - Provide creation (registration) and querying endpoints for states and cities.
 *
 * Assumptions:
 * - Validation middleware populates:
 *     req.validated.body
 *     req.validated.query
 *     req.validated.params
 * - Authentication / authorization (if required) is enforced upstream (this file currently
 *   does not restrict access; add role checks if only admins should create locations).
 * - State model expected fields (minimum):
 *     { _id, name: string, code?: string, createdAt, updatedAt }
 *   plus either:
 *     - a 'cities' field (array of ObjectId refs), OR
 *     - a virtual named 'cities' populated via City model (e.g., City has 'state' foreign key).
 * - City model expected fields (minimum):
 *     { _id, name: string, state (or stateId): ObjectId(ref State), createdAt, updatedAt }
 *
 * Common HTTP Status Codes:
 * - 200 OK      Successful retrieval
 * - 201 Created Resource created successfully
 * - 400 Bad Request (not explicitly thrown here—add for validation/business rules as needed)
 * - 404 Not Found (not used here but may apply for future single-resource endpoints)
 * - 500 Internal Server Error (unexpected; forwarded)
 *
 * Notes / Potential Inconsistencies:
 * - In registerCity: City is created with field 'state' (state: stateId).
 *   In getCities: queries use 'stateId' and populate('stateId').
 *   Ensure the City schema uses a consistent field name (either 'state' or 'stateId'):
 *     e.g., CitySchema = { state: { type: ObjectId, ref: 'State' } }
 *   Then update getCities to query on 'state' and populate('state').
 * - Similarly, State.find(...).populate("cities") assumes a 'cities' field or virtual is defined.
 *   If using a virtual, ensure: StateSchema.virtual('cities', { ref: 'City', localField: '_id', foreignField: 'state' }).
 */

/**
 * Register (create) a new state.
 *
 * Workflow:
 * 1. Extract validated name/code from body.
 * 2. Persist new State document.
 * 3. Return created state with 201 status.
 *
 * Request Body (validated):
 * {
 *   name: string,
 *   code?: string  // optional state code / abbreviation
 * }
 *
 * Success (201):
 * {
 *   message: "State registered successfully",
 *   state: { ...stateDoc }
 * }
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next Next middleware
 * @returns {Promise<void>}
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
 * Register (create) a new city.
 *
 * Workflow:
 * 1. Extract validated name and stateId from body.
 * 2. Create City document referencing its parent state.
 * 3. Return created city with 201 status.
 *
 * Request Body (validated):
 * {
 *   name: string,
 *   stateId: string(ObjectId)  // must reference an existing State
 * }
 *
 * Success (201):
 * {
 *   message: "City registered successfully",
 *   city: { ...cityDoc }
 * }
 *
 * Important:
 * - The code uses field 'state' when creating (state: stateId). Ensure this matches your City schema.
 *   If your schema uses 'stateId', change the object to { name, stateId } and adjust all other references.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.registerCity = async (req, res, next) => {
    try {
        const { name, stateId } = req.validated.body;
        const city = new City({ name, state: stateId }); // Adjust to { stateId } if schema uses stateId
        await city.save();

        res
            .status(201)
            .json({ message: "City registered successfully", city });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Retrieve a list of states (optionally filtered).
 *
 * Query Parameters (validated, all optional):
 * - name?: string   Exact match (adjust to regex if partial needed)
 * - code?: string   Exact match (adjust to regex if partial needed)
 *
 * Behavior:
 * - Builds a simple filter object.
 * - Populates 'cities' relation (requires either:
 *     a) State schema with cities: [ObjectId], OR
 *     b) a virtual 'cities' referencing City model).
 *
 * Success (200):
 * {
 *   states: [ { ...stateDoc, cities?: [...] }, ... ]
 * }
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
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
 * Retrieve a list of cities (optionally filtered).
 *
 * Query Parameters (validated, all optional):
 * - name?: string             Exact name match (use regex for partial if desired)
 * - stateId?: string(ObjectId) Filter by parent state
 *
 * Behavior:
 * - Builds a filter for City model.
 * - Populates 'stateId' (if schema uses 'state', update populate target accordingly).
 *
 * Success (200):
 * {
 *   cities: [ { ...cityDoc, stateId?: { ...stateDoc } }, ... ]
 * }
 *
 * Potential Bug:
 * - Code filters with query.stateId and populates "stateId" but city creation used 'state' field.
 *   Ensure consistency: if schema uses 'state', change:
 *     if (stateId) query.state = stateId;
 *     City.find(query).populate("state");
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getCities = async (req, res, next) => {
    try {
        const { name, stateId } = req.validated.query;
        const query = {};

        if (name) query.name = name;
        if (stateId) query.stateId = stateId; // If schema uses 'state', change to query.state = stateId

        const cities = await City.find(query).populate("stateId"); // If schema uses 'state', change to .populate("state")
        res.status(200).json({ cities });
    } catch (err) {
        console.error(err);
        next(err);
    }
};