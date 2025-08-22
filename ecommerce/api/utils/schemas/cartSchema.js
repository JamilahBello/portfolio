const { z } = require("zod");
const { objectId } = require("./sharedSchema");

exports.addToCartBody = z.object({
    productId: objectId,
    quantity: z.number().min(1).default(1),
});

exports.cartIdParam = z.object({
    id: objectId,
});

exports.cartItemIdParam = z.object({
    productId: objectId,
});

exports.removeFromCartQuery = z.object({
    quantity: z.coerce
    .number({ required_error: "quantity is required", invalid_type_error: "quantity must be a number" })
    .int("quantity must be an integer")
    .min(1, "quantity must be at least 1"),
});