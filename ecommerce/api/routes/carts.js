const express = require("express");
const router = express.Router();
const {
    addToCart,
    getCart,
    removeFromCart,
    clearCart
} = require("../controllers/cartsController");
const { authenticate } = require("../middleware/auth");
const { 
    validateBody,
    validateParams,
    validateQuery
} = require("../utils/validate");
const { 
    cartIdParam,
    addToCartBody,
    removeFromCartQuery,
    cartItemIdParam
 } = require("../utils/schemas/cartSchema");

router.post(
    "/",
    authenticate,
    validateBody(addToCartBody),
    addToCart
);
router.get(
    "/:id",
    authenticate,
    validateParams(cartIdParam),
    getCart
);
router.delete(
    "/items/:productId",
    authenticate,
    validateParams(cartItemIdParam),
    validateQuery(removeFromCartQuery),
    removeFromCart
);
router.delete(
    "/clear",
    authenticate,
    clearCart
);

module.exports = router;
