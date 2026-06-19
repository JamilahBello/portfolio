const Category = require("../models/Category");
const ApiError = require("../utils/apiError");

/**
 * Categories Controller
 *
 * Responsibilities:
 * - Create (add), list, update, and delete category resources.
 * - Support simple filtering by id and exact name.
 * - (Optionally extend) Provide hierarchical parent/child category structure.
 *
 * Assumptions:
 * - Authorization (e.g., admin-only mutations) is enforced upstream (no role checks here).
 * - Validation middleware populates:
 *     req.validated.body
 *     req.validated.params
 *     req.validated.query
 * - Category model minimal fields (expected):
 *     {
 *       _id,
 *       name: string,
 *       description?: string,
 *       parentCategory?: ObjectId(ref Category),
 *       createdAt,
 *       updatedAt
 *     }
 *
 * Common HTTP Status Codes:
 * - 200 OK              Successful read / update / delete
 * - 201 Created         Successful creation
 * - 400 Bad Request     (Not explicitly used; add for validation/business logic failures)
 * - 404 Not Found       Category not found (id queries / update / delete)
 * - 409 Conflict        (Not implemented; consider for duplicate names if uniqueness enforced)
 * - 500 Internal Server Error (unexpected; forwarded to error handler)
 *
 * Notes:
 * - Deletion uses hard delete (findByIdAndDelete). If you need referential integrity or audit history, switch to soft delete.
 * - getCategories currently uses exact name matching; adjust to regex for partial search if needed.
 * - addCategory does not prevent duplicate names; enforce uniqueness in schema or add a pre-check.
 */

/**
 * Create (add) a new category.
 *
 * Workflow:
 * 1. Extract validated fields (name, description, parentCategory).
 * 2. Persist new Category document.
 * 3. Return created document with 201 status.
 *
 * Request Body (validated):
 * {
 *   name: string,
 *   description?: string,
 *   parentCategory?: string(ObjectId)  // Optional parent category id
 * }
 *
 * Success (201):
 * {
 *   message: "Category added successfully",
 *   category: { ...categoryDoc }
 * }
 *
 * Error Responses:
 * - (Potential) 409 if duplicate name uniqueness enforced.
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next Next middleware
 * @returns {Promise<void>}
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
 * Retrieve a list of categories (optionally filtered).
 *
 * Query Parameters (validated, all optional):
 * - id?: string(ObjectId)    Exact category id
 * - name?: string            Exact name match (change to regex for partial match if desired)
 *
 * Behavior:
 * - Builds query object from provided filters.
 * - If id is specified and no category is found, returns 404.
 * - Returns array (possibly empty) of matching categories.
 *
 * Success (200):
 * {
 *   categories: [ { ...categoryDoc }, ... ]
 * }
 *
 * Error Responses:
 * - 404 Category not found (only when id filter provided and no match)
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next Next middleware
 * @returns {Promise<void>}
 */
exports.getCategories = async (req, res, next) => {
    try {
        const { id, name } = req.validated.query;
        const query = {};

        if (id) query._id = id;
        if (name) query.name = name;

        const categories = await Category.find(query);
        if (id && categories.length === 0) {
            throw ApiError.notFound("Category not found");
        }

        res.status(200).json({ categories });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Update a category (partial update).
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Request Body (validated):
 * - Any subset of updatable fields: { name?, description?, parentCategory? }
 *
 * Workflow:
 * 1. Locate and update category by id.
 * 2. Return updated document or 404 if not found.
 *
 * Success (200):
 * {
 *   message: "Category updated successfully",
 *   category: { ...updatedCategoryDoc }
 * }
 *
 * Error Responses:
 * - 404 Category not found
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next Next middleware
 * @returns {Promise<void>}
 */
exports.updateCategory = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const updates = req.validated.body;

        const category = await Category.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true },
        );

        if (!category) {
            throw ApiError.notFound("Category not found");
        }

        res
            .status(200)
            .json({ message: "Category updated successfully", category });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

/**
 * Delete a category (hard delete).
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Workflow:
 * 1. Locate category by id.
 * 2. Permanently delete document (findByIdAndDelete).
 * 3. Return success message or 404 if not found.
 *
 * Success (200):
 * {
 *   message: "Category deleted successfully"
 * }
 *
 * Error Responses:
 * - 404 Category not found
 *
 * Notes:
 * - Switch to a soft delete (e.g., set deletedAt) if categories are referenced by other documents.
 * - Consider preventing deletion when children categories or products depend on this category.
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next Next middleware
 * @returns {Promise<void>}
 */
exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const category = await Category.findByIdAndDelete(id);

        if (!category) {
            throw ApiError.notFound("Category not found");
        }

        res
            .status(200)
            .json({ message: "Category deleted successfully" });
    } catch (err) {
        console.error(err);
        next(err);
    }
};