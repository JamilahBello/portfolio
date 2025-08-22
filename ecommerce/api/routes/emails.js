const express = require("express");
const router = express.Router();
const { createEmail, sendEmails } = require("../controllers/emailsController");
const { authenticate } = require("../middleware/auth");
const { authenticateRoles } = require("../middleware/authRoles");
const { validateBody } = require("../utils/validate");
const { createEmailBody } = require("../utils/schemas/emailSchemas");

router.post(
    "/create",
    authenticate,
    authenticateRoles("admin"),
    validateBody(createEmailBody),
    createEmail,
);
router.post("/send/bulk", authenticate, sendEmails);

module.exports = router;
