const { z } = require("zod");
const { objectId } = require("./sharedSchema");

exports.emailSchema = z.email("Invalid email address");
exports.passwordSchema = z
    .string()
    .trim()
    .min(6, "Password must be at least 6 characters long");
exports.phoneSchema = z
    .string()
    .trim()
    .regex(/^0\d{10}$/, "Phone must be 11 digits and start with 0");
exports.nameSchema = z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100);

exports.addresses = z.array(
    z.object({
        street: z.string().trim().optional(),
        city: objectId.optional(),
        state: objectId.optional(),
    }),
);

const roleSchema = z.enum(["admin", "customer", "business", "staff"]);

exports.registerUserBody = z.object({
    email: this.emailSchema,
    password: this.passwordSchema,
    phone: this.phoneSchema,
    firstname: this.nameSchema.optional(),
    lastname: this.nameSchema.optional(),
    type: roleSchema.optional(),
});

exports.loginBody = z.object({
    email: this.emailSchema,
    password: z.string().min(1, "Password is required"),
});

exports.forgotPasswordBody = z.object({
    email: this.emailSchema,
});

exports.userIdParam = z.object({
    id: objectId,
});

exports.getUsersQuery = z.object({
    id: objectId.optional(),
    email: z.string().trim().optional(),
    firstname: z.string().trim().optional(),
    lastname: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    name: z.string().trim().optional(),
});

exports.updateUserBody = z.object({
    email: this.emailSchema.optional(),
    phone: this.phoneSchema.optional(),
    firstname: this.nameSchema.optional(),
    lastname: this.nameSchema.optional(),
    type: roleSchema.optional(),
    addresses: this.addresses.optional(),
});
