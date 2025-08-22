const { z } = require('zod');
const { objectId } = require('./sharedSchema');

exports.createInvoiceBody = z.object({
    orderId: objectId,
    proofOfPayment: z.url().optional(),
    discountReason: z.enum(['Discount applied', 'Promotional offer']).optional(),
    discountAmount: z.number().min(0).optional(),
}).superRefine((data, ctx) => {
    // If a discount is applied, require a reason
    if (data.discountAmount > 0 && !data.discountReason) {
      ctx.addIssue({
        code: z.custom,
        path: ["discountReason"],
        message: "discountReason is required when discountAmount > 0",
      });
    }
});

exports.payInvoiceBody = z.object({
    invoiceId: objectId,
    proofOfPayment: z.url(),
});

exports.invoiceIdParam = z.object({
    id: objectId,
});

exports.getInvoicesQuery = z.object({
    orderId: objectId.optional(),
    status: z.enum(['pending', 'paid', 'cancelled']).optional(),
});

exports.updateInvoiceBody = z.object({
    status: z.enum(['pending', 'paid', 'cancelled']).optional(),
});