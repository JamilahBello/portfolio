const Category = require("../models/Category");

/**
 * Add a new category
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.addCategory = async (req, res, next) => {
    try {
        const { name, description, parentCategory } = req.validated.body;

        const category = new Category({ name, description, parentCategory });
        await category.save();
        res.status(201).json({
            message: "Category added successfully",
            category,
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Get a list of categories
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.getCategories = async (req, res, next) => {
    try {
        const { id, name } = req.validated.query;

        let query = {};
        if (id) query._id = id;
        if (name) query.name = name;

        const categories = await Category.find(query);
        if (id && categories.length === 0) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.status(200).json({ categories });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Update a category
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.updateCategory = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const updates = req.validated.body;

        const category = await Category.findByIdAndUpdate(
            id, 
            updates, {
            new: true,
        });

        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.status(200).json({ message: "Category updated successfully", category });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Delete a category
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }
        res.status(200).json({ message: "Category deleted successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};
