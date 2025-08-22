const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");

/**
 * Create a new order
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.createOrder = async (req, res, next) => {
    try {
        const { userId, products, shippingAddress, paymentMethod, deliveryFee } = req.validated.body;

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

        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                // Respond and return immediately!
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

        // Update product quantity
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (product) {
                const quantity = product.quantity - item.quantity;
                product.quantity = quantity;
                await product.save();
            }
        }

        // Create an invoice for the order
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
 * Get a list of orders
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.getOrders = async (req, res, next) => {
    try {
        const { id, userId, status, paymentStatus, deleted } = req.validated.query;
        const query = {};

        if (id) query._id = id;
        if (userId) query.userId = userId;
        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (deleted) query.deleted = deleted;

        // Non-admin/staff users can only see their own invoices
        if (!["admin", "staff"].includes(req.user.type)) {
            query.userId = req.user.id;
        }

        if (deleted === "true") {
            orders =
                await Order.findDeleted(query).populate("products.productId");
        } else if (deleted === "false") {
            orders =
                await Order.findNonDeleted(query).populate(
                    "products.productId",
                );
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
 * Get an order by ID
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.getOrder = async (req, res, next) => {
    try {
        const { id } = req.validated.params;

        const order = await Order.findById(id).populate("products.productId");
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.userId.toString() !== req.user.id && !["admin", "staff"].includes(req.user.type)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        res.status(200).json({ order });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Update an order
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
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

        // Soft delete the previous invoice
        const invoice = await Invoice.findOne({
            orderId: order._id,
            deletedAt: null,
        });
        await invoice.softDelete();

        // Create new invoice associated with the order
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
 * Delete an order
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
exports.deleteOrder = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.paymentStatus === "paid") {
            return res
                .status(400)
                .json({ error: "Cannot delete a paid order" });
        }

        // Update product quantity
        for (const item of order.products) {
            const product = await Product.findById(item.productId);
            if (product) {
                const quantity = product.quantity + item.quantity;
                product.quantity = quantity;
                await product.save();
            }
        }

        invoice = await Invoice.findOne({ orderId: order._id });
        await invoice.softDelete();
        await order.softDelete();
        
        res.status(200).json({ message: "Order deleted successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};
