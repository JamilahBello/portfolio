const Invoice = require("../models/Invoice");
const Order = require("../models/Order");

/**
 * Invoices Controller
 *
 * Responsibilities:
 * - Create invoices for orders (optionally marking them paid if proofOfPayment is provided).
 * - Retrieve (list / single) invoices with role-based access (owner or admin/staff).
 * - Pay (mark as paid) existing invoices and cascade payment status to the related order.
 * - Delete invoices (currently hard delete) when unpaid.
 *
 * Assumptions:
 * - req.user is attached by authentication middleware: { id: string(ObjectId), type: "customer" | "admin" | "staff" | ... }.
 * - Validation middleware populates:
 *     req.validated.body
 *     req.validated.params
 *     req.validated.query
 * - Invoice model exposes:
 *     - createInvoiceNumber() instance method
 *     - (optional) soft delete helpers: findDeleted/findNonDeleted if a soft-delete plugin is in use
 * - Order model contains: { _id, userId, products, totalAmount, paymentStatus, ... }.
 * - An invoice's status is one of: "unpaid" | "paid" (extend as needed).
 *
 * Common HTTP Status Codes:
 * - 200 OK              Successful read / update / payment / deletion
 * - 201 Created         Successful invoice creation
 * - 400 Bad Request     Business rule failure (e.g., already paid)
 * - 403 Forbidden       Unauthorized access to another user's invoice
 * - 404 Not Found       Order or Invoice not found
 * - 500 Internal Server Error (unexpected)
 *
 * Notes:
 * - Deletion uses hard delete (findByIdAndDelete). If you prefer soft deletes, replace with a deletedAt flag update.
 * - Paying an invoice updates the linked order's paymentStatus to "paid". Consider idempotency & concurrency controls.
 * - Discount & pricing logic is passed through from the order; ensure integrity at order creation time.
 */

/**
 * Create a new invoice.
 *
 * Workflow:
 * 1. Fetch the linked order by orderId.
 * 2. Reject if order does not exist.
 * 3. Construct invoice with financial fields (totalAmount from order, discount info).
 * 4. Set status to "paid" if proofOfPayment is provided, else "unpaid".
 * 5. Generate invoice number and persist.
 *
 * Request Body (validated):
 * {
 *   orderId: string(ObjectId),
 *   discountAmount?: number,
 *   discountReason?: string,
 *   proofOfPayment?: string (URL / reference to payment proof)
 * }
 *
 * Success (201):
 * {
 *   message: "Invoice created successfully",
 *   invoice: { ...invoiceDoc }
 * }
 *
 * Error Responses:
 * - 404 Order not found
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next Next middleware
 * @returns {Promise<void>}
 */
exports.createInvoice = async (req, res, next) => {
    try {
        const {
            orderId,
            discountAmount,
            proofOfPayment,
            discountReason,
        } = req.validated.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const invoice = new Invoice({
            userId: order.userId,
            orderId,
            proofOfPayment,
            totalAmount: order.totalAmount,
            discountAmount,
            discountReason,
            products: order.products,
            status: proofOfPayment ? "paid" : "unpaid",
        });

        invoice.invoiceNumber = invoice.createInvoiceNumber();
        await invoice.save();

        res
            .status(201)
            .json({ message: "Invoice created successfully", invoice });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Retrieve a list of invoices (optionally filtered, optionally including deleted).
 *
 * Query Parameters (validated, all optional):
 * - invoiceId?: string(ObjectId)   Exact invoice _id
 * - orderId?: string(ObjectId)     Filter by order
 * - userId?: string(ObjectId)      Filter by user (ignored for non-privileged users; replaced by req.user.id)
 * - deleted?: "true" | "false"     Filter by deletion state if soft-delete plugin is active
 *
 * Behavior:
 * - Non-admin/staff users are restricted to their own invoices regardless of provided userId.
 * - If deleted==="true": only soft-deleted invoices (Invoice.findDeleted).
 * - If deleted==="false": only non-deleted invoices (Invoice.findNonDeleted).
 * - If deleted omitted: both non-deleted + deleted returned (merged).
 * - Each invoice has orderId populated.
 *
 * Success (200):
 * {
 *   invoices: [ { ...invoiceDocPopulated }, ... ]
 * }
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getInvoices = async (req, res, next) => {
    try {
        const { invoiceId, orderId, userId, deleted } = req.validated.query;
        const query = {};
        if (invoiceId) query._id = invoiceId;
        if (orderId) query.orderId = orderId;
        if (userId) query.userId = userId;

        // Restrict non-privileged users to their own invoices
        if (!["admin", "staff"].includes(req.user.type)) {
            query.userId = req.user.id;
        }

        let invoices;
        if (deleted === "true") {
            invoices = await Invoice.findDeleted(query).populate("orderId");
        } else if (deleted === "false") {
            invoices = await Invoice.findNonDeleted(query).populate("orderId");
        } else {
            const [active, deletedInvoices] = await Promise.all([
                Invoice.find(query).populate("orderId"),
                Invoice.findDeleted(query).populate("orderId"),
            ]);
            invoices = [...active, ...deletedInvoices];
        }

        res.status(200).json({ invoices });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Retrieve a single invoice by ID.
 *
 * Authorization:
 * - Owner (invoice.userId === req.user.id) OR admin/staff.
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Success (200):
 * {
 *   invoice: { ...invoiceDoc }
 * }
 *
 * Error Responses:
 * - 404 Invoice not found
 * - 403 Unauthorized (not owner and insufficient role)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getInvoice = async (req, res, next) => {
    try {
        const { id } = req.validated.params;

        const invoice = await Invoice.findById(id);
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        if (
            invoice.userId.toString() !== req.user.id &&
            !["admin", "staff"].includes(req.user.type)
        ) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        res.status(200).json({ invoice });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Delete an invoice (hard delete).
 *
 * Workflow:
 * 1. Locate invoice.
 * 2. Reject if status === "paid".
 * 3. Hard delete invoice document.
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Success (200):
 * {
 *   message: "Invoice deleted successfully"
 * }
 *
 * Error Responses:
 * - 404 Invoice not found
 * - 400 Invoice already paid
 *
 * NOTE:
 * - Consider soft deleting instead (set deletedAt) to preserve audit trails.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.deleteInvoice = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const invoice = await Invoice.findById(id).populate("orderId");
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        if (invoice.status === "paid") {
            return res.status(400).json({ error: "Invoice already paid" });
        }

        await Invoice.findByIdAndDelete(id);
        res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Mark an invoice as paid.
 *
 * Workflow:
 * 1. Fetch invoice by invoiceId.
 * 2. Reject if already paid.
 * 3. Set status to "paid" and attach proofOfPayment.
 * 4. Persist changes.
 * 5. Update related order's paymentStatus to "paid" (if order exists).
 *
 * Request Body (validated):
 * {
 *   invoiceId: string(ObjectId),
 *   proofOfPayment: string   // URL / reference token / attachment id
 * }
 *
 * Success (200):
 * {
 *   message: "Invoice paid successfully",
 *   invoice: { ...updatedInvoiceDoc }
 * }
 *
 * Error Responses:
 * - 404 Invoice not found
 * - 400 Invoice already paid
 *
 * NOTE:
 * - Consider idempotency: if already paid, returning 200 with current state could be acceptable instead of 400.
 * - Payment validation (e.g., verifying external transaction) should be added for production.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.payInvoice = async (req, res, next) => {
    try {
        const { invoiceId, proofOfPayment } = req.validated.body;
        const invoice = await Invoice.findById(invoiceId).populate("orderId");
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        if (invoice.status === "paid") {
            return res.status(400).json({ error: "Invoice already paid" });
        }

        invoice.status = "paid";
        invoice.proofOfPayment = proofOfPayment;
        await invoice.save();

        const order = await Order.findById(invoice.orderId);
        if (order) {
            order.paymentStatus = "paid";
            await order.save();
        }

        res
            .status(200)
            .json({ message: "Invoice paid successfully", invoice });
    } catch (err) {
        console.error(err);
        next(err);
    }
}; 