const Email = require('../models/Email');
const { validateEmailInput } = require('../utils/validators');
const { sanitizeEmail } = require('../utils/formatters');
const nodemailer = require('nodemailer');

exports.createEmail = async (req, res, next) => {
    const { to, subject, body } = req.body;

    try {
        const { error } = validateEmailInput(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const email = new Email({
            to: sanitizeEmail(to),
            subject: sanitizeEmail(subject),
            body: sanitizeEmail(body)
        });
        await email.save();
        res.status(201).json({ message: 'Email created', email: email.getDetails() });
    } catch (error) {
        next(error);
    }
};

exports.updateEmailStatus = async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const email = await Email.findById(id);
        if (!email) {
            return res.status(404).json({ error: 'Email not found' });
        }

        email.status = status;
        await email.save();
        res.status(200).json({ message: 'Email status updated', email: email.getDetails() });
    } catch (error) {
        next(error);
    }
};

exports.sendEmails = async (req, res, next) => {
    try {
        const emails = await Email.find({ status: 'pending' });
        if (!emails || emails.length === 0) {
            return res.status(200).json({ message: 'No pending emails to send' });
        }

        const transporter = nodemailer.createTransport({
            service: 'outlook',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const results = await Promise.all(emails.map(async (email) => {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: sanitizeEmail(email.to),
                    subject: email.subject,
                    text: email.body
                });
                email.status = 'sent';
                await email.save();
                return { id: email._id, status: 'sent' };
            } catch (err) {
                return { id: email._id, status: 'failed', error: err.message };
            }
        }));

        res.status(201).json({ message: 'Bulk email process complete', results });
    } catch (error) {
        next(error);
    }
};
