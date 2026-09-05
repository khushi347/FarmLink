const express = require("express");
const router = express.Router();
const demo = require("../controllers/demoController");

// All demo routes are intentionally public (no auth middleware).
// Demo data is isolated by isDemo:true + demoSessionId tags.
// The dedicated demo shop/user is completely separate from real partners.

router.get("/token", demo.getToken);
router.get("/status", demo.getStatus);
router.post("/step", demo.runStep);
router.delete("/reset", demo.reset);
router.get("/map", demo.getMapData);

module.exports = router;
