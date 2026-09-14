const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { validate } = require("../middleware/validateRequest");

const createOrderValidation = validate({
    body: {
        farmerId: { required: true, isObjectId: true, message: "A valid farmerId is required" },
        aiData: { required: true, type: "object", message: "aiData object is required" }
    }
});

router.post("/create", createOrderValidation, orderController.createOrder);

module.exports = router;