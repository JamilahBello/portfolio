const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");

/**
 * Orders Controller
 *
 * Responsibilities:
 * - Create orders (and their associated invoices) and manage order lifecycle (read, update, soft delete).
 * - Enforce access control (users see only their orders; admins/staff can view all).
 * - Adjust product inventory on creation and (soft) deletion.
 * - Regenerate invoices when order attributes that affect billing change.
 *
 * Assumptions:
 * - req.user is attached by authentication middleware: { id: ObjectIdString, type: "customer" | "admin" | "staff" | ... }.
 * - Validation middleware populates:
 *     req.validated.body
 *     req.validated.params
 *     req.validated.query
 * - Order model exposes:
 *     - createTrackingNumber() instance method
 *     - softDelete() instance method (marks deletedAt)
 *     - static scopes: findDeleted(query), findNonDeleted(query)
 * - Invoice model exposes:
 *     - createInvoiceNumber() instance method
 *     - softDelete()
 * - Product model has fields: { _id, quantity (stock), price }.
 *
 * Common HTTP Status Codes:
 * - 200 OK              Successful read / update / soft delete
 * - 201 Created         Order successfully created
 * - 400 Bad Request     Business rule failures (e.g., insufficient stock, price mismatch, deleting paid order)
 * - 403 Forbidden       Unauthorized access to another user's order
 * - 404 Not Found       Resource not found (order, product)
 * - 500 Internal Server Error (unexpected)
 *
 * Notes:
 * - Current implementation performs multiple sequential awaits for product lookups; consider batching or using aggregation for performance.
 * - Price mismatch check ensures client-submitted price is current; consider locking or using snapshots to avoid race conditions.
 * - Inventory reduction occurs after initial validation loop—race conditions could still allow overselling without database-level safeguards.
 */

/**
 * Create a new order.
 *
 * Workflow:
 * 1. Authorization: user must be owner (userId === req.user.id) or privileged (admin/staff).
 * 2. Validate each product:
 *    - Exists
 *    - Sufficient quantity (stock)
 *    - Submitted price matches current product price
 * 3. Create order, generate tracking number, save.
 * 4. Decrement product quantities.
 * 5. Create & persist invoice (with generated invoice number).
 *
 * Request Body (validated):
 * {
 *   userId: string(ObjectId),          // Owner of the order
 *   products: [{
 *     productId: string(ObjectId),
 *     quantity: number (>0),
 *     price: number (client-side snapshot, must match current)
 *   }],
 *   shippingAddress: { ... },          // Shape defined elsewhere
 *   paymentMethod?: string,
 *   deliveryFee?: number
 * }
 *
 * Success (201):
 * {
 *   message: "Order created successfully",
 *   order: { ...orderDocument }
 * }
 *
 * Error Responses:
 * - 403 Unauthorized (if userId mismatch and not privileged)
 * - 404 Product not found
 * - 400 Insufficient stock
 * - 400 Price mismatch
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next Next middleware
 * @returns {Promise<void>}
 */
exports.createOrder = async (req, res, next) => {
    try {
        const {
            userId,
            products,
            shippingAddress,
            paymentMethod,
            deliveryFee,
        } = req.validated.body;

        if (userId !== req.user.id && !["admin", "staff"].includes(req.user.type)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const order = new Order({
            userId,
            products,
            shippingAddress,
            paymentMethod,
            deliveryFee,
        });

        // Validate products before mutating inventory
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({ error: "Insufficient stock" });
            }
            if (product.price !== item.price) {
                return res.status(400).json({ error: "Price mismatch" });
            }
        }

        order.trackingNumber = order.createTrackingNumber();
        await order.save();

        // Decrement inventory
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.quantity = product.quantity - item.quantity;
                await product.save();
            }
        }

        // Create invoice
        const invoice = new Invoice({
            orderId: order._id,
            userId: order.userId,
            products: order.products,
        });
        invoice.invoiceNumber = invoice.createInvoiceNumber();
        await invoice.save();

        res.status(201).json({ message: "Order created successfully", order });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Retrieve a list of orders (optionally including deleted).
 *
 * Query Parameters (validated, all optional):
 * - id?: string(ObjectId)             Exact order id
 * - userId?: string(ObjectId)         Filter by user (privileged roles only; otherwise overridden to req.user.id)
 * - status?: string                   Order status filter (e.g., "pending", "paid")
 * - paymentStatus?: string            Payment status filter
 * - deleted?: "true" | "false"        Filter by deletion state
 *
 * Behavior:
 * - Non-admin/staff users always restricted to their own orders.
 * - If deleted === "true": returns only soft-deleted orders.
 * - If deleted === "false": returns only non-deleted orders.
 * - If deleted omitted: returns both active + deleted (merged).
 *
 * Success (200):
 * {
 *   orders: [ { ...orderDocPopulated }, ... ]
 * }
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getOrders = async (req, res, next) => {
    try {
        const { id, userId, status, paymentStatus, deleted } = req.validated.query;
        const query = {};

        if (id) query._id = id;
        if (userId) query.userId = userId;
        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (deleted) query.deleted = deleted; // If your schema uses deletedAt, adjust accordingly.

        // Restrict non-privileged users
        if (!["admin", "staff"].includes(req.user.type)) {
            query.userId = req.user.id;
        }

        let orders;
        if (deleted === "true") {
            orders = await Order.findDeleted(query).populate("products.productId");
        } else if (deleted === "false") {
            orders = await Order.findNonDeleted(query).populate("products.productId");
        } else {
            const [active, deletedOrders] = await Promise.all([
                Order.find(query).populate("products.productId"),
                Order.findDeleted(query).populate("products.productId"),
            ]);
            orders = [...active, ...deletedOrders];
        }

        res.status(200).json({ orders });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Retrieve a single order by ID.
 *
 * Authorization:
 * - Owner of the order OR admin/staff.
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Success (200):
 * {
 *   order: { ...orderDocPopulated }
 * }
 *
 * Error Responses:
 * - 404 Order not found
 * - 403 Unauthorized (not owner and insufficient role)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getOrder = async (req, res, next) => {
    try {
        const { id } = req.validated.params;

        const order = await Order.findById(id).populate("products.productId");
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (
            order.userId.toString() !== req.user.id &&
            !["admin", "staff"].includes(req.user.type)
        ) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        res.status(200).json({ order });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Update an order (status, paymentStatus, deliveryFee).
 *
 * Workflow:
 * 1. Find order by ID and update specified fields.
 * 2. Soft delete existing (active) invoice.
 * 3. Create a new invoice snapshot for updated order.
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Request Body (validated):
 * {
 *   status?: string,
 *   paymentStatus?: string,
 *   deliveryFee?: number
 * }
 *
 * Success (200):
 * {
 *   message: "Order updated successfully",
 *   order: { ...updatedOrderDoc }
 * }
 *
 * Error Responses:
 * - 404 Order not found
 *
 * NOTE:
 * - Assumes any status transitions are business-rule validated externally or in model hooks.
 * - Re-invoicing logic assumes invoice reflects current order state.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.updateOrder = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const { status, paymentStatus, deliveryFee } = req.validated.body;

        const order = await Order.findByIdAndUpdate(
            id,
            { $set: { status, paymentStatus, deliveryFee } },
            { new: true, runValidators: true },
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const invoice = await Invoice.findOne({
            orderId: order._id,
            deletedAt: null,
        });
        if (invoice) {
            await invoice.softDelete();
        }

        const newInvoice = new Invoice({
            orderId: order._id,
            userId: order.userId,
            products: order.products,
        });
        newInvoice.invoiceNumber = newInvoice.createInvoiceNumber();
        await newInvoice.save();

        res.status(200).json({ message: "Order updated successfully", order });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Soft delete an order.
 *
 * Workflow:
 * 1. Retrieve order.
 * 2. Validate that order is not paid (cannot delete paid orders).
 * 3. Restore product inventory quantities.
 * 4. Soft delete associated invoice (if exists).
 * 5. Soft delete order.
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Success (200):
 * {
 *   message: "Order deleted successfully"
 * }
 *
 * Error Responses:
 * - 404 Order not found
 * - 400 Cannot delete a paid order
 *
 * NOTE:
 * - Inventory restoration uses current product.quantity + ordered quantity.
 * - Consider handling concurrency / versioning to prevent race conditions.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.deleteOrder = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.paymentStatus === "paid") {
            return res.status(400).json({ error: "Cannot delete a paid order" });
        }

        // Restore inventory
        for (const item of order.products) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.quantity = product.quantity + item.quantity;
                await product.save();
            }
        }

        let invoice = await Invoice.findOne({ orderId: order._id });
        if (invoice) {
            await invoice.softDelete();
        }

        await order.softDelete();

        res.status(200).json({ message: "Order deleted successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};