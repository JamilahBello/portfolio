const express = require("express");
const router = express.Router();
const {
    registerCity,
    registerState,
    getStates,
    getCities,
} = require("../controllers/geographiesController");
const { authenticate } = require("../middleware/auth");
const { authenticateRoles } = require("../middleware/authRoles");
const { 
    validateBody,
    validateQuery
} = require("../utils/validate");
const { 
    registerStateBody,
    registerCityBody,
    getStatesQuery,
    getCitiesQuery
} = require("../utils/schemas/geographySchema");

router.post(
    "/states",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateBody(registerStateBody),
    registerState,
);
router.post(
    "/cities",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateBody(registerCityBody),
    registerCity,
);
router.get(
    "/states",
    authenticate,
    validateQuery(getStatesQuery),
    getStates
);
router.get(
    "/cities",
    authenticate,
    validateQuery(getCitiesQuery),
    getCities
);

module.exports = router;
