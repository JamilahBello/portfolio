const express = require("express");
const router = express.Router();
const {
    addCategory,
    getCategories,
    updateCategory,
    deleteCategory
} = require("../controllers/categoriesController");
const { authenticate } = require("../middleware/auth");
const { authenticateRoles } = require("../middleware/authRoles");
const { 
    validateBody,
    validateQuery
} = require("../utils/validate");
const { 
    addCategoryBody,
    updateCategoryBody,
    getCategoriesQuery,
    categoryIdParam
} = require("../utils/schemas/categorySchema");

router.post(
    "/",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateBody(addCategoryBody),
    addCategory,
);
router.get(
    "/",
    validateQuery(getCategoriesQuery),
    getCategories
);
router.put(
    "/:id",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateBody(updateCategoryBody),
    validateQuery(categoryIdParam),
    updateCategory
);
router.delete(
    "/:id",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateQuery(categoryIdParam),
    deleteCategory
);

module.exports = router;
