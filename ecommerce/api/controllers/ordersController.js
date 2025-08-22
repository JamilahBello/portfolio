const Order = require('../models/Order');
const Invoice = require('../models/Invoice');

exports.createOrder = async (req, res, next) => {
  try {
    const { userId, products, shippingAddress, paymentMethod } = req.body;

    const order = new Order({ userId, products, shippingAddress, paymentMethod });
    order.trackingNumber = order.createTrackingNumber();
    await order.save();

    // Update product stock
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (product) {
        const stock = product.stock - item.quantity;
        await product.updateStock(stock);
      }
    }

    // Create an invoice for the order
    const invoice = new Invoice({ orderId: order._id, userId: order.userId, products: order.products });
    invoice.invoiceNumber = invoice.createInvoiceNumber();
    await invoice.save();
    
    res.status(201).json({ message: 'Order created successfully', order });
  } catch (err) {
    next(err);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate('products.productId');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== userId && (!req.user.type.includes('admin') || !req.user.type.includes('staff'))) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
};

exports.getAllOrdersByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).populate('products.productId');
    res.status(200).json({ orders });
  } catch (err) {
    next(err);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    if (req.user.type === 'admin' || req.user.type === 'staff') {
      const orders = await Order.find().populate('products.productId');
      return res.status(200).json({ orders });
    }

    const orders = await Order.find({ userId: req.user.id }).populate('products.productId');
    res.status(200).json({ orders });
  } catch (err) {
    next(err);
  }
};

exports.getDeletedOrdersByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const deletedOrders = await Order.findDeletedByUserId(userId);
    res.status(200).json({ deletedOrders });
  } catch (err) {
    next(err);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const order = await Order.findByIdAndUpdate(id, updates, { new: true });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    // Soft delete the previous invoice
    const invoice = await Invoice.findOne({ orderId: order._id });
    await invoice.softDelete(invoice._id);
    
    // Create new invoice associated with the order
    const newInvoice = new Invoice({ orderId: order._id, userId: order.userId, products: order.products });
    newInvoice.invoiceNumber = newInvoice.createInvoiceNumber();
    await newInvoice.save();

    res.status(200).json({ message: 'Order updated successfully', order });
  } catch (err) {
    next(err);
  }
};

exports.deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Cannot delete a paid order' });
    }

    await order.findByIdAndDelete(id);
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (err) {
    next(err);
  }
};
