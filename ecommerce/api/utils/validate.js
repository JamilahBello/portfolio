// middleware/validate.js
// Reusable Zod validation middlewares for body/params/query

const ApiError = require("./apiError");

const formatZodErrors = (zerr) =>
    zerr.issues.reduce((acc, issue) => {
        const key = issue.path?.[0] ?? "root";
        acc[key] = issue.message;
        return acc;
    }, {});

exports.validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
        throw ApiError.badRequest("Validation failed", formatZodErrors(result.error));
    }
    req.validated = { ...(req.validated || {}), body: result.data };
    next();
};

exports.validateParams = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.params ?? {});
    if (!result.success) {
        throw ApiError.badRequest("Validation failed", formatZodErrors(result.error));
    }
    req.validated = { ...(req.validated || {}), params: result.data };
    next();
};

exports.validateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
        throw ApiError.badRequest("Validation failed", formatZodErrors(result.error));
    }
    req.validated = { ...(req.validated || {}), query: result.data };
    next();
};
