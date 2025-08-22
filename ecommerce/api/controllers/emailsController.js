const Email = require("../models/Email");
const { sanitizeEmail } = require("../utils/formatters");
const nodemailer = require("nodemailer");
const { createEmailBody } = require("../utils/schemas/emailSchemas");

/**
 * Emails Controller
 *
 * Responsibilities:
 * - Persist outbound email records (queue) prior to sending.
 * - Update status of stored emails (e.g., pending -> sent / failed / cancelled).
 * - Bulk-send all pending emails using a configured SMTP transporter (Outlook in current setup).
 * - Provide an internal service helper (createEmailService) for other modules to enqueue emails.
 *
 * Assumptions:
 * - Validation middleware populates:
 *     req.validated.body
 *     req.validated.params
 *     req.validated.query
 * - Email model exposes:
 *     - getDetails(): returns a safe serialized representation
 *     - Fields (typical): { to, subject, body, status, errorMessage?, createdAt, updatedAt }
 * - Email statuses (convention):
 *     "pending" | "sent" | "failed" | "cancelled"
 * - Environment variables:
 *     EMAIL_USER, EMAIL_PASS (SMTP authentication)
 *
 * Common HTTP Status Codes:
 * - 200 OK              Successful retrieval/update (e.g., status update or no pending emails)
 * - 201 Created         Email record created OR bulk send operation processed
 * - 400 Bad Request     (Not explicitly thrown here; could be used for invalid status transitions)
 * - 404 Not Found       Email not found (status update)
 * - 500 Internal Server Error (unexpected)
 *
 * Notes / Improvements:
 * - Currently uses Promise.all; sending many emails concurrently may trigger SMTP throttling.
 *   Consider batching/chunking or a background job/queue (e.g., Bull, RabbitMQ).
 * - Transporter is re-created on each bulk send; you could reuse a singleton instance.
 * - createEmail uses req.validated (typo fixed from req.validate).
 * - Consider adding idempotency (e.g., avoid re-sending already marked "sent").
 */

/**
 * Create (enqueue) a new email (does NOT send immediately).
 *
 * Workflow:
 * 1. Extract validated fields (to, subject, body) from request body.
 * 2. Persist a new Email document (default status assumed "pending" via model default).
 * 3. Return created email details.
 *
 * Request Body (validated):
 * {
 *   to: string (email address),
 *   subject: string,
 *   body: string
 * }
 *
 * Success (201):
 * {
 *   message: "Email created",
 *   email: { ...sanitizedEmailDetails }
 * }
 *
 * Error Responses:
 * - 500 Unexpected persistence error (forwarded)
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next Express next middleware
 * @returns {Promise<void>}
 */
exports.createEmail = async (req, res, next) => {
    try {
        const { to, subject, body } = req.validated.body;

        const email = new Email({
            to,
            subject,
            body,
        });

        await email.save();
        res.status(201).json({
            message: "Email created",
            email: email.getDetails(),
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

/**
 * Update the status of a stored email.
 *
 * Workflow:
 * 1. Locate email by id.
 * 2. Apply new status (no transition validation currently).
 * 3. Save and return updated details.
 *
 * Path Params (validated):
 * - id: string(ObjectId)
 *
 * Request Body (validated):
 * {
 *   status: "pending" | "sent" | "failed" | "cancelled"
 * }
 *
 * Success (200):
 * {
 *   message: "Email status updated",
 *   email: { ...emailDetails }
 * }
 *
 * Error Responses:
 * - 404 Email not found
 *
 * NOTE:
 * - Consider restricting updates (e.g., cannot move from sent -> pending without cloning).
 * - Consider capturing reason or errorMessage on failed/cancelled transitions.
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next  Next middleware
 * @returns {Promise<void>}
 */
exports.updateEmailStatus = async (req, res, next) => {
    try {
        const { id } = req.validated.params;
        const { status } = req.validated.body;

        const email = await Email.findById(id);
        if (!email) {
            return res.status(404).json({ error: "Email not found" });
        }

        email.status = status;
        await email.save();

        res.status(200).json({
            message: "Email status updated",
            email: email.getDetails(),
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

/**
 * Bulk send all emails in "pending" status.
 *
 * Workflow:
 * 1. Query pending emails.
 * 2. If none, respond with informational message (200).
 * 3. Create nodemailer transporter (Outlook service).
 * 4. Attempt to send each email (in parallel via Promise.all).
 * 5. On success: mark email.status = "sent".
 *    On failure: mark email.status = "failed" and (optionally) store error message (not currently saved).
 *
 * Success (201):
 * {
 *   message: "Bulk email process complete",
 *   results: [
 *     { id: string, status: "sent" },
 *     { id: string, status: "failed", error?: string },
 *     ...
 *   ]
 * }
 *
 * Edge Cases / Considerations:
 * - SMTP rate limits can cause failures; consider batching or retry/backoff strategy.
 * - For large volumes, move to a queue processor.
 * - sanitizeEmail used for recipient address normalization/validation (ensure it preserves valid structure).
 *
 * Error Responses:
 * - 200 "No pending emails to send" (when empty set)
 *
 * @param {import('express').Request} req  Express request
 * @param {import('express').Response} res  Express response
 * @param {import('express').NextFunction} next  Next middleware
 * @returns {Promise<void>}
 */
exports.sendEmails = async (req, res, next) => {
    try {
        const emails = await Email.find({ status: "pending" });
        if (!emails || emails.length === 0) {
            return res.status(200).json({ message: "No pending emails to send" });
        }

        const transporter = nodemailer.createTransport({
            service: "outlook",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const results = await Promise.all(
            emails.map(async (email) => {
                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: sanitizeEmail(email.to),
                        subject: email.subject,
                        text: email.body,
                    });
                    email.status = "sent";
                    await email.save();
                    return { id: email._id, status: "sent" };
                } catch (err) {
                    email.status = "failed";
                    // If the model supports an errorMessage field, uncomment:
                    // email.errorMessage = err.message;
                    await email.save();
                    return {
                        id: email._id,
                        status: "failed",
                        error: err.message,
                    };
                }
            }),
        );

        res.status(201).json({
            message: "Bulk email process complete",
            results,
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

/**
 * Internal service helper to enqueue a new email (bypasses Express response cycle).
 *
 * Workflow:
 * 1. Validate payload with zod schema (createEmailBody).
 * 2. Persist Email document on success.
 * 3. Return sanitized email details; throw on validation failure.
 *
 * Parameters:
 * {
 *   to: string,
 *   subject: string,
 *   body: string,
 *   (additional optional fields depending on schema)
 * }
 *
 * Returns:
 * - Promise<EmailDetails>
 *
 * Throws:
 * - Error("Invalid email data") if validation fails.
 *
 * Example:
 *   await createEmailService({ to: "user@example.com", subject: "Hi", body: "Hello" });
 *
 * @param {object} payload Email creation payload
 * @returns {Promise<object>} Serialized email details
 */
exports.createEmailService = async (payload = {}) => {
    const parsed = createEmailBody.safeParse(payload);
    if (!parsed.success) {
        throw new Error("Invalid email data");
    }

    const email = new Email(parsed.data);
    await email.save();
    return email.getDetails();
};