const Product = require("../models/Product");

/**
 * Products Controller
 *
 * Responsibilities:
 * - Create, read, update, and delete product resources.
 * - Support basic filtering when listing products (by id, category, name substring, price range).
 * - Enforce (externally) any role-based access (this file assumes authorization middleware
 *   has already permitted the request; add explicit role checks here if needed).
 *
 * Assumptions:
 * - req.user is attached by authentication middleware (shape at least: { id, type }).
 * - Validation middleware populates:
 *     req.validated.body   (for JSON body payload)
 *     req.validated.params (for route parameters)
 *     req.validated.query  (for query string parameters)
 * - Product model fields (minimum expected):
 *     {
 *       _id,
 *       name: string,
 *       description?: string,
 *       price: number,
 *       category?: ObjectId,
 *       quantity?: number,          // or stock
 *       images?: string[],
 *       createdAt, updatedAt
 *     }
 *
 * Common HTTP Status Codes:
 * - 200 OK          Successful read or update
 * - 201 Created     Successful creation of a resource
 * - 400 Bad Request Validation or business rule violation (not explicitly thrown here but can be added)
 * - 404 Not Found   Product does not exist
 * - 500 Internal Server Error for unexpected failures (forwarded to error middleware)
 *
 * NOTE:
 * - This controller currently performs hard deletes (findByIdAndDelete). If soft deletes are desired,
 *   replace delete logic with a field update (e.g., deletedAt).
 * - Additional business rules (e.g., uniqueness of slug, role restrictions) should be layered in
 *   either via middleware or added to the relevant handlers below.
 */

/**
 * Create a new product.
 *
 * Workflow:
 * 1. Extract validated fields from request body.
 * 2. Persist a new Product document.
 * 3. Return the created product with 201 status.
 *
 * Request Body (validated example):
 * {
 *   name: string,
 *   price: number (> 0),
 *   description?: string,
 *   category?: string(ObjectId)
 * }
 *
 * Success (201):
 * {
 *   message: "Product created successfully",
 *   product: { ...productDocument }
 * }
 *
 * Error Cases (forwarded to error handler):
 * - Validation errors from Mongoose (e.g., required fields)
 * - Unexpected server errors
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next  Express next middleware
 * @returns {Promise<void>}
 */
exports.createProduct = async (req, res, next) => {
    try {
        const { name, price, description, category } = req.validated.body;

        const product = new Product({ name, price, description, category });
        await product.save();

        res.status(201).json({
            message: "Product created successfully",
            product,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Retrieve a list of products (optionally filtered).
 *
 * Supported Query Parameters (validated):
 * - id?: string(ObjectId)           Exact product id
 * - category?: string(ObjectId)     Category id
 * - name?: string                   Case-insensitive partial name match
 * - minPrice?: number               Minimum price (inclusive)
 * - maxPrice?: number               Maximum price (inclusive)
 *
 * Behavior:
 * - Builds a dynamic MongoDB query object based on provided filters.
 * - Returns an array (possibly empty) of matching products.
 * - Does not paginate by default (add pagination if product list can grow large).
 *
 * Success (200):
 * {
 *   products: [ { ...productDoc }, ... ]
 * }
 *
 * Error Cases:
 * - Unexpected server errors forwarded to error handler.
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next  Express next middleware
 * @returns {Promise<void>}
 */
exports.getProducts = async (req, res, next) => {
    try {
        const { id, category, name, minPrice, maxPrice } = req.validated.query;
        const query = {};

        if (id) query._id = id;
        if (category) query.category = category;
        if (name) query.name = { $regex: name, $options: "i" };
        if (minPrice) query.price = { $gte: minPrice };
        if (maxPrice) query.price = { ...query.price, $lte: maxPrice };

        const products = await Product.findNonDeleted(query);
        res.status(200).json({ products });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Retrieve a single product by its ID.
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Success (200):
 * {
 *   product: { ...productDoc }
 * }
 *
 * Error Responses:
 * - 404 Product not found
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next  Express next middleware
 * @returns {Promise<void>}
 */
exports.getProduct = async (req, res, next) => {
    try {
        const { id } = req.validated.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.status(200).json({ product });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Update a product (partial update).
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Request Body (validated):
 * - Any subset of updatable fields (e.g., name, price, description, category, quantity, images)
 *
 * Success (200):
 * {
 *   message: "Product updated successfully",
 *   product: { ...updatedProductDoc }
 * }
 *
 * Error Responses:
 * 404 Product not found
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next  Express next middleware
 * @returns {Promise<void>}
 */
exports.updateProduct = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const updates = req.validated.body;

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true },
        );

        if (!updatedProduct) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.status(200).json({
            message: "Product updated successfully",
            product: updatedProduct,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Delete a product (soft delete).
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Success (200):
 * {
 *   message: "Product deleted successfully"
 * }
 *
 * Error Responses:
 * 404 Product not found
 *
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next  Express next middleware
 * @returns {Promise<void>}
 */
exports.deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.validated.params;

        const product = await Product.findOne({ _id: id });

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        await product.softDelete();

        res.status(200).json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};