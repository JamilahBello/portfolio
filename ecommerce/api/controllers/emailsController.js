const Email = require("../models/Email");
const { sanitizeEmail } = require("../utils/formatters");
const nodemailer = require("nodemailer");
const { createEmailBody } = require("../utils/schemas/emailSchemas");

/**
 * Create a new email
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.createEmail = async (req, res, next) => {
    const { to, subject, body } = req.validate.body;

    try {
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
 * Update an email status
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.updateEmailStatus = async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
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
 * Send bulk emails
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.sendEmails = async (req, res, next) => {
    try {
        const emails = await Email.find({ status: "pending" });
        if (!emails || emails.length === 0) {
            return res
                .status(200)
                .json({ message: "No pending emails to send" });
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
 * Create a new email
 * @param {*} payload 
 * @returns email details
 */
exports.createEmailService = async (payload = {}) => {
    if (createEmailBody.safeParse(payload).success) {
        const email = new Email(payload);
        await email.save();

        return email.getDetails();
    } else {
        throw new Error("Invalid email data");
    }
};
