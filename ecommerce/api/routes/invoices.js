const express = require("express");
const router = express.Router();
const {
    createInvoice,
    getInvoices,
    getInvoice,
    deleteInvoice,
    payInvoice,
} = require("../controllers/invoicesController");
const { authenticate } = require("../middleware/auth");
const { authenticateRoles } = require("../middleware/authRoles");
const {
    validateBody,
    validateQuery,
    validateParams
} = require("../utils/validate");
const { 
    invoiceIdParam,
    createInvoiceBody, 
    getInvoicesQuery,
    payInvoiceBody
} = require("../utils/schemas/invoiceSchema");

router.post(
    "/",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateBody(createInvoiceBody),
    createInvoice
);
router.get(
    "/",
    authenticate,
    validateQuery(getInvoicesQuery),
    getInvoices
);
router.get(
    "/:id",
    authenticate,
    validateParams(invoiceIdParam),
    getInvoice
);
router.post(
    "/pay",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateBody(payInvoiceBody),
    payInvoice
);
router.delete(
    "/:id",
    authenticate,
    authenticateRoles("admin", "staff"),
    validateParams(invoiceIdParam),
    deleteInvoice
);

module.exports = router;