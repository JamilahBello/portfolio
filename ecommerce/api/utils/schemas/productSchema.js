const { z } = require("zod");
const { objectId } = require("./sharedSchema");

exports.createProductBody = z.object({
    name: z.string().min(2).max(100),
    description: z.string().min(10).max(1000),
    price: z.number().min(0),
    category: objectId,
    images: z.array(z.url()).min(1).max(5),
});

exports.productIdParam = z.object({
    id: objectId,
});

exports.getProductsQuery = z.object({
    id: objectId.optional(),
    category: objectId.optional(),
    name: z.string().min(2).max(100).optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    search: z.string().min(2).max(100).optional(),
});

exports.updateProductBody = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().min(10).max(1000).optional(),
    price: z.number().min(0).optional(),
    quantity: z.number().min(0).optional(),
    category: objectId.optional(),
    images: z.array(z.url()).min(1).max(5).optional(),
});
