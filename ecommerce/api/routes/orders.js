const express = require("express");
const router = express.Router();
const {
    createOrder,
    getOrders,
    getOrder,
    updateOrder,
    deleteOrder,
} = require("../controllers/ordersController");
const { authenticate } = require("../middleware/auth");
const { authenticateRoles } = require("../middleware/authRoles");
const {
    validateBody,
    validateQuery,
    validateParams,
} = require("../utils/validate");
const {
    getOrdersQuery,
    createOrderBody,
    orderIdParam,
    updateOrderBody,
} = require("../utils/schemas/orderSchema");

router.post(
    "/",
    authenticate,
    validateBody(createOrderBody),
    createOrder
);
router.get(
    "/",
    authenticate,
    validateQuery(getOrdersQuery),
    getOrders
);
router.get(
    "/:id",
    authenticate,
    validateParams(orderIdParam),
    getOrder
);
router.put(
    "/:id",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateBody(updateOrderBody),
    validateParams(orderIdParam),
    updateOrder
);
router.delete(
    "/:id",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateParams(orderIdParam),
    deleteOrder,
);

module.exports = router;
