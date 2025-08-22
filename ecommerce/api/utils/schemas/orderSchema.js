const { z } = require("zod");
const { objectId } = require("./sharedSchema");

exports.createOrderBody = z.object({
    userId: objectId,
    products: z.array(
                z.object({
                    productId: objectId,
                    quantity: z.number().min(1),
                    price: z.number().min(0),
                }),
            )
        .min(1),
    shippingAddress: z.object({
        street: z.string().min(2).max(100),
        city: z.string().min(2).max(100),
        state: z.string().min(2).max(100),
    }),
    paymentMethod: z.enum(["credit_card", "paypal", "bank_transfer"]),
    deliveryFee: z.number().min(0).default(0),
});

exports.orderIdParam = z.object({
    id: objectId,
});

exports.getOrdersQuery = z.object({
    id: objectId.optional(),
    userId: objectId.optional(),
    status: z.enum(["pending", "completed", "cancelled"]).optional(),
    paymentStatus: z.enum(["paid", "unpaid"]).optional(),
});

exports.updateOrderBody = z.object({
    status: z.enum(["pending", "completed", "cancelled"]).optional(),
    paymentStatus: z.enum(["paid", "unpaid"]).optional(),
    deliveryFee: z.number().min(0).default(0),
});
