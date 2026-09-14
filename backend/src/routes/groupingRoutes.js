const express = require("express");
const router = express.Router();
const groupOrderController = require("../controllers/groupingController");
const { validateObjectIdParam } = require("../middleware/validateRequest");

router.post("/:orderId", validateObjectIdParam("orderId"), groupOrderController);

module.exports = router;