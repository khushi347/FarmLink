const express = require("express");
const { login, refresh, logout } = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");
const { validate } = require("../middleware/validateRequest");

const router = express.Router();

const loginValidation = validate({
    body: {
        email: { required: true, isEmail: true, message: "A valid email is required" },
        password: { required: true, minLength: 1, message: "Password is required" }
    }
});

router.post("/login", authLimiter, loginValidation, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

module.exports = router;