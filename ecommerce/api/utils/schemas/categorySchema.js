const { z } = require("zod");
const { objectId } = require("./sharedSchema");

exports.addCategoryBody = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    parentCategory: objectId.optional()
});

exports.updateCategoryBody = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    parentCategory: objectId.optional()
});

exports.getCategoriesQuery = z.object({
    id: objectId.optional(),
    name: z.string().min(2).max(100).optional()
});

exports.categoryIdParam = z.object({
    id: objectId
});
