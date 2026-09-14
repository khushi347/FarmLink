const express = require("express");
const router = express.Router();

const parseOrder = require("../controllers/aiController");
const aiAssistantController = require("../controllers/aiAssistantController");
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { aiLimiter } = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validateRequest");

const parseOrderValidation = validate({
    body: {
        transcript: { required: true, minLength: 1, message: "transcript is required" }
    }
});

const assistantValidation = validate({
    body: {
        question: {
            required: false,
            custom: (val, body) => {
                const q = body.question || body.query;
                if (!q || typeof q !== "string" || q.trim().length === 0) {
                    return "Please provide a natural-language question string.";
                }
                return true;
            }
        }
    }
});

router.post("/parse-order", aiLimiter, parseOrderValidation, parseOrder);
router.post("/assistant", aiLimiter, auth, authorize(["admin", "shopkeeper"]), assistantValidation, aiAssistantController.handleAssistantQuery);

module.exports = router;