const Cart = require('../models/Cart');

exports.addToCart = async (req, res, next) => {
  try {
    const {productId, quantity } = req.body;

    const cart = await Cart.findOneAndUpdate(
      { userId: req.user.id },
      { $addToSet: { items: { productId, quantity } } },
      { new: true, upsert: true }
    );
    res.status(201).json({ message: 'Product added to cart successfully', cart });
  } catch (err) {
    next(err);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId !== req.user.id && (!req.user.type.includes('admin') || !req.user.type.includes('staff'))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    const cart = await Cart.findOneAndUpdate(
      { userId: req.user.id, 'items.productId': productId },
      { $set: { 'items.$.quantity': quantity } },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    res.status(200).json({ message: 'Cart item updated successfully', cart });
  } catch (err) {
    next(err);
  }
};

exports.deleteCartItem = async (req, res, next) => {
  try {
    const { productId } = req.body;

    const cart = await Cart.findOneAndUpdate(
      { userId: req.user.id },
      { $pull: { items: { productId } } },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    res.status(200).json({ message: 'Product removed from cart successfully', cart });
  } catch (err) {
    next(err);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { items: [] } },
      { new: true }
    );
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    res.status(200).json({ message: 'Cart cleared successfully', cart });
  } catch (err) {
    next(err);
  }
};
