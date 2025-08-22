const { z } = require("zod");
const mongoose = require("mongoose");

exports.objectId = z
    .string()
    .refine((v) => mongoose.Types.ObjectId.isValid(v), {
        message: "Invalid ObjectId",
    });
