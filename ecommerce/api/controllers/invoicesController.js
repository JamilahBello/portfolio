const Invoice = require("../models/Invoice");
const Order = require("../models/Order");

/**
 * Create a new invoice
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.createInvoice = async (req, res, next) => {
    try {
        const { orderId, discountAmount, proofOfPayment, discountReason } = req.validated.body;

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

        res.status(201).json({ message: "Invoice created successfully", invoice });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Get a list of invoices
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.getInvoices = async (req, res, next) => {
    try {
        const { invoiceId, orderId, userId, deleted } = req.validated.query;
        const query = {};
        if (invoiceId) query._id = invoiceId;
        if (orderId) query.orderId = orderId;
        if (userId) query.userId = userId;

        // Non-admin/staff users can only see their own invoices
        if (!["admin", "staff"].includes(req.user.type)) {
            query.userId = req.user.id;
        }

        let invoices;
        if (deleted === "true") {
            invoices = await Invoice.findDeleted(query).populate("orderId");
        } else if (deleted === "false") {
            invoices = await Invoice.findNonDeleted(query).populate("orderId");
        } else {
            // Return both deleted and non-deleted invoices
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
 * Get an invoice by ID
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.getInvoice = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        
        const invoice = await Invoice.findById(id);
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        if (invoice.userId.toString() !== req.user.id && !["admin", "staff"].includes(req.user.type)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        res.status(200).json({ invoice });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Delete an invoice
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.deleteInvoice = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const invoice = await Invoice.findById(id).populate("orderId");
        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }

        if (invoice.status === "paid") {
            return res
                .status(400)
                .json({ error: "Invoice already paid" });
        }

        await Invoice.findByIdAndDelete(id);
        res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Pay an invoice
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
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

        // Update invoice status and proof of payment
        invoice.status = "paid";
        invoice.proofOfPayment = proofOfPayment;
        await invoice.save();

        // Update order status
        const order = await Order.findById(invoice.orderId);
        if (order) {
            order.paymentStatus = "paid";
            await order.save();
        }

        res.status(200).json({ message: "Invoice paid successfully", invoice });
    } catch (err) {
        console.error(err);
        next(err);
    }
};
