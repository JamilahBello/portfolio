const Cart = require("../models/Cart");
const Product = require("../models/Product");

/**
 * Add a product to the cart
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.addToCart = async (req, res, next) => {
    try {
        const { productId, quantity } = req.validated.body;

        const product = await Product.findOne({ _id: productId, deletedAt: null });
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        if (product.quantity != null && product.quantity < quantity) {
          return res.status(400).json({ error: "Insufficient stock" });
        }

        const cart = await Cart.findOrCreate(req.user.id);

        // update line
        const line = cart.products.find(lineProduct => lineProduct.productId.toString() === productId);
        if (line) {
            line.quantity += quantity;
        } else {
            cart.products.push({ productId, quantity });
        }

        await cart.save();

        res.status(200).json({ message: "Cart updated successfully", cart });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Get the user's cart
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.getCart = async (req, res, next) => {
    try {
        const { id } = req.validated.params;

        const cart = await Cart.findById(id);
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }

        if (cart.userId.toString() !== req.user.id &&!["admin", "staff"].includes(req.user.type)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        res.status(200).json({ cart });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Remove a product from the cart
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.removeFromCart = async (req, res, next) => {
    try {
        const { productId } = req.validated.params;
        const {  quantity } = req.validated.query;
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }

        // update line
        const line = cart.products.find(lineProduct => lineProduct.productId.toString() === productId);
        if (line) {
            line.quantity -= quantity ?? 0;
            if (line.quantity <= 0) {
                cart.products.pull(line);
            }
        }

        await cart.save();

        res.status(200).json({ message: "Cart updated successfully", cart });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Clear the user's cart
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.clearCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOneAndUpdate(
            { userId: req.user.id },
            { $set: { items: [] } },
            { new: true },
        );
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }
        res.status(200).json({ message: "Cart cleared successfully", cart });
    } catch (err) {
        console.error(err);
        next(err);
    }
};
