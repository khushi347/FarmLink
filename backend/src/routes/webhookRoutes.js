const express = require("express");
const router = express.Router();
const handlewebHook = require("../controllers/handlewebHook");
const validateTwilioWebhook = require("../middleware/validateTwilioWebhook");

router.post("/twilio", validateTwilioWebhook, handlewebHook);

module.exports = router;