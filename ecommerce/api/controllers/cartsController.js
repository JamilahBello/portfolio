const Cart = require("../models/Cart");
const Product = require("../models/Product");

/**
 * Cart Controller
 *
 * This module exposes CRUD‑like operations for a user's shopping cart.
 * Assumptions:
 * - req.user is attached by authentication middleware (shape at least: { id, type }).
 * - Validation middleware populates:
 *     req.validated.body   (for JSON body payload)
 *     req.validated.params (for route parameters)
 *     req.validated.query  (for query string parameters)
 * - Cart model shape (inferred):
 *     {
 *       userId: ObjectId,
 *       products: [{ productId: ObjectId, quantity: number }]
 *     }
 * - Product model is expected to have at least _id, deletedAt (nullable), and a stock/quantity
 *   field indicating available inventory. In this code we check product.quantity; rename to
 *   product.stock if that is the actual semantic meaning (recommended for clarity).
 *
 * Common HTTP Status Codes:
 * - 200 OK: Successful read/update.
 * - 201 Created: Optionally returned if you decide to differentiate newly created cart or line item.
 * - 400 Bad Request: Invalid stock or invalid quantity (could be added).
 * - 403 Forbidden: User not authorized to access a cart (getCart).
 * - 404 Not Found: Product or Cart not found.
 * - 500 Internal Server Error: Unhandled exceptions.
 *
 * NOTE: Messages are kept generic for consistency, but you may want more specific
 * i18n-aware or client-friendly codes.
 */

/**
 * Add (or increment) a product in the authenticated user's cart.
 *
 * Workflow:
 * 1. Validate product existence (must not be soft-deleted).
 * 2. (Optional / current) Check available stock using product.quantity (rename to stock if appropriate).
 * 3. Retrieve or create the user's cart using a custom static Cart.findOrCreate(userId).
 * 4. If product line exists, increment quantity; else push new line.
 * 5. Save cart and return updated cart.
 *
 * Current limitations / TODO:
 * - Does not differentiate between "cart created" vs "line created" vs "quantity incremented" in status/message (always 200).
 * - Does not validate maximum per-line quantity or maximum cart size.
 * - Assumes req.validated.body has productId (ObjectId string) and quantity (number).
 *
 * @param {import('express').Request} req Express request
 * @param {import('express').Response} res Express response
 * @param {Function} next Express next middleware
 * @returns {Promise<void>}
 *
 * Request Body (validated):
 * {
 *   productId: string(ObjectId),
 *   quantity: number (int > 0)
 * }
 *
 * Success Response (200):
 * {
 *   message: "Cart updated successfully",
 *   cart: { ...cartDoc }
 * }
 *
 * Error Responses:
 * 404 Product not found
 * 400 Insufficient stock
 * 500 Internal server error
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
 * Get authenticated user's cart.
 *
 * Workflow:
 * 1. Validate cart existence.
 * 2. Check the user type (must be authenticated).
 * 3. Retrieve and send user's cart.
 *
 * @param {import('express').Request} req Express request
 * @param {import('express').Response} res Express response
 * @param {Function} next Express next middleware
 * @returns {Promise<void>}
 *
 * Request Param (validated):
 * {
 *   id: string(ObjectId),
 * }
 *
 * Success Response (200):
 * {
 *   cart: { ...cartDoc }
 * }
 *
 * Error Responses:
 * 404 Cart not found
 * 403 Unauthorized
 * 500 Internal server error
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
 * Remove (or decrement) a product in the authenticated user's cart.
 *
 * Workflow:
 * 1. Validate cart existence
 * 2. Validate product existence (must not be soft-deleted).
 * 4. If product line exists, decrement quantity; else pull line.
 * 5. Save cart and return updated cart.
 *
 * @param {import('express').Request} req Express request
 * @param {import('express').Response} res Express response
 * @param {Function} next Express next middleware
 * @returns {Promise<void>}
 *
 * Request Body (validated):
 * {
 *   productId: string(ObjectId),
 * }
 *
 * Request Query (validated):
 * {
 *   quantity: number (int > 0)
 * }
 *
 * Success Response (200):
 * {
 *   message: "Cart updated successfully",
 *   cart: { ...cartDoc }
 * }
 *
 * Error Responses:
 * 404 Cart not found
 * 404 Product not found
 * 500 Internal server error
 */
exports.removeFromCart = async (req, res, next) => {
    try {
        const { productId } = req.validated.params;
        const {  quantity } = req.validated.query;
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product || product.isDeleted) {
            return res.status(404).json({ error: "Product not found" });
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
 * Remove (or decrement) a product in the authenticated user's cart.
 *
 * Workflow:
 * 1. Attempts to find and update the user's cart.
 * 2. Validate cart existence.
 * 3. Save cart and return updated cart.
 *
 * @param {import('express').Request} req Express request
 * @param {import('express').Response} res Express response
 * @param {Function} next Express next middleware
 * @returns {Promise<void>}
 *
 *
 * Success Response (200):
 * {
 *   message: "Cart cleared successfully",
 *   cart: { ...cartDoc }
 * }
 *
 * Error Responses:
 * 404 Cart not found
 * 500 Internal server error
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
