const express = require("express");
const router = express.Router();
const {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
} = require("../controllers/productsController");
const { authenticate } = require("../middleware/auth");
const { authenticateRoles } = require("../middleware/authRoles");
const {
    validateBody,
    validateQuery,
    validateParams,
} = require("../utils/validate");
const {
    createProductBody,
    updateProductBody,
    productIdParam,
    getProductsQuery,
} = require("../utils/schemas/productSchema");

router.post(
    "/",
    authenticate,
    authenticateRoles("admin"),
    validateBody(createProductBody),
    createProduct,
);
router.get(
    "/",
    authenticate,
    validateQuery(getProductsQuery),
    getProducts
);
router.get(
    "/:id",
    authenticate,
    validateParams(productIdParam),
    getProduct
);
router.put(
    "/:id",
    authenticate,
    authenticateRoles("admin"),
    validateParams(productIdParam),
    validateBody(updateProductBody),
    updateProduct,
);
router.delete(
    "/:id",
    authenticate,
    authenticateRoles("admin"),
    validateParams(productIdParam),
    deleteProduct,
);

module.exports = router;
