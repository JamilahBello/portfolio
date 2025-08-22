const Product = require("../models/Product");

/**
 * Create a new product
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
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
 * Get a list of products
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
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

        const products = await Product.find(query);
        res.status(200).json({ products });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Get a product by ID
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
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
 * Update a product
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
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
 * Delete a product
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
exports.deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.validated.params;

        const product = await Product.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.status(200).json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};
