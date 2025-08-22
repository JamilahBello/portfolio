const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    logoutUser,
    forgotPassword,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
} = require("../controllers/usersController");
const { authenticate } = require("../middleware/auth");
const { authenticateRoles } = require("../middleware/authRoles");
const {
    registerUserBody,
    loginBody,
    forgotPasswordBody,
    getUsersQuery,
    userIdParam,
    updateUserBody,
} = require("../utils/schemas/userSchemas");
const {
    validateBody,
    validateQuery,
    validateParams,
} = require("../utils/validate");

router.post("/register", validateBody(registerUserBody), registerUser);
router.post("/login", validateBody(loginBody), loginUser);
router.post("/logout", logoutUser);
router.post(
    "/forgot-password",
    validateBody(forgotPasswordBody),
    forgotPassword,
);
router.get(
    "/",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateQuery(getUsersQuery),
    getUsers,
);
router.get(
    "/:id",
    authenticate,
    validateParams(userIdParam),
    getUser
);
router.put(
    "/:id",
    authenticate,
    authenticateRoles("admin"),
    validateBody(updateUserBody),
    validateParams(userIdParam),
    updateUser,
);
router.delete(
    "/:id",
    authenticate,
    authenticateRoles("admin"),
    validateParams(userIdParam),
    deleteUser,
);

module.exports = router;
