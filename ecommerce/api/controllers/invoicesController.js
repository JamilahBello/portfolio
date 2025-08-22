const Invoice = require('../models/Invoice');
const Order = require('../models/Order');

exports.createInvoice = async (req, res, next) => {
  try {
    const { orderId, amount, status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const invoice = new Invoice({ orderId, amount, status, products: order.products });
    invoice.invoiceNumber = invoice.createInvoiceNumber();
    await invoice.save();
    res.status(201).json({ message: 'Invoice created successfully', invoice });
  } catch (err) {
    next(err);
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.userId.toString() !== userId && (!req.user.type.includes('admin') || !req.user.type.includes('staff'))) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.status(200).json({ invoice });
  } catch (err) {
    next(err);
  }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id).populate('orderId');
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete a paid invoice' });
    }

    await Invoice.findByIdAndDelete(id);
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getDeletedInvoicesByOrderId = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const deletedInvoices = await Invoice.findDeletedByOrderId(orderId);
    res.status(200).json({ deletedInvoices });
  } catch (err) {
    next(err);
  }
};

exports.payInvoiceAndOrder = async (req, res, next) => {
  try {
    const { invoiceId, proofOfPayment } = req.params;
    const invoice = await Invoice.findById(invoiceId).populate('orderId');
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    // Update invoice status and proof of payment
    invoice.status = 'paid';
    invoice.proofOfPayment = proofOfPayment;
    await invoice.save();

    // Update order status
    const order = await Order.findById(invoice.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
    }

    res.status(200).json({ message: 'Invoice and order paid successfully', invoice });
  } catch (err) {
    next(err);
  }
};

exports.getAllInvoicesByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.id && (!req.user.type.includes('admin') || !req.user.type.includes('staff'))) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const invoices = await Invoice.find({ userId }).populate('orderId');
    res.status(200).json({ invoices });
  } catch (err) {
    next(err);
  }
};

exports.getAllInvoices = async (req, res, next) => {
  try {
    if (req.user.type === 'admin' || req.user.type === 'staff') {
      const invoices = await Invoice.find().populate('orderId');
      return res.status(200).json({ invoices });
    }

    const invoices = await Invoice.find({ userId: req.user.id }).populate('orderId');
    res.status(200).json({ invoices });
  } catch (err) {
    next(err);
  }
};
