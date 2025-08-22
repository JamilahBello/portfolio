const { z } = require("zod");
const { emailSchema } = require("./userSchemas");

exports.createEmailBody = z.object({
    to: emailSchema,
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Body is required"),
});
