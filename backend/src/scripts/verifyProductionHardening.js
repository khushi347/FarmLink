/**
 * FarmLink — Production Hardening Verification Suite
 * Verifies Security Headers, CORS, Rate Limiting, Error Handling, Request Validation,
 * JWT Security & Token Rotation, Webhook Idempotency, and RBAC Boundaries.
 */

const assert = require("assert");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const jwt = require("jsonwebtoken");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");
const ProcessedWebhook = require("../models/ProcessedWebhook");
const { validateEnv, getSanitizedConfig } = require("../config/env");

const PORT = 5555;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let server;

async function startTestServer() {
    return new Promise((resolve) => {
        server = http.createServer(app);
        server.listen(PORT, () => {
            resolve();
        });
    });
}

async function stopTestServer() {
    return new Promise((resolve) => {
        if (server) {
            server.close(() => resolve());
        } else {
            resolve();
        }
    });
}

async function runVerification() {
    console.log("===============================================================");
    console.log("  FarmLink — Production Hardening Verification Suite           ");
    console.log("===============================================================");

    await connectDB();
    await startTestServer();
    console.log(`Test server running at ${BASE_URL}\n`);

    try {
        // -------------------------------------------------------------
        // Test 1: Environment Validation & Sanitized Diagnostics
        // -------------------------------------------------------------
        console.log("[Test 1/9] Verifying Environment Validation & Secret Masking...");
        const isValid = validateEnv();
        assert.strictEqual(isValid, true, "validateEnv() should return true for valid env");

        const sanitized = getSanitizedConfig();
        assert(sanitized.JWT_SECRET.includes("***"), "JWT_SECRET must be redacted in sanitized config");
        assert(sanitized.MONGO_URI.includes("****"), "MONGO_URI password must be masked in sanitized config");
        console.log("  ✓ Environment variables validated and secret redaction verified.");

        // -------------------------------------------------------------
        // Test 2: HTTP Security Headers (Helmet) & Express Leaks
        // -------------------------------------------------------------
        console.log("\n[Test 2/9] Verifying Helmet Security Headers...");
        const resHelmet = await fetch(`${BASE_URL}/api/demo/status`, {
            headers: { "x-test-bypass": "farmlink-test" }
        });
        
        assert.strictEqual(resHelmet.headers.get("x-content-type-options"), "nosniff", "X-Content-Type-Options must be nosniff");
        assert.strictEqual(resHelmet.headers.get("x-frame-options"), "SAMEORIGIN", "X-Frame-Options must be SAMEORIGIN");
        assert.strictEqual(resHelmet.headers.get("x-powered-by"), null, "X-Powered-By header must be removed");
        console.log("  ✓ Security headers verified: nosniff, SAMEORIGIN active; X-Powered-By removed.");

        // -------------------------------------------------------------
        // Test 3: Centralized 404 & Error Handling
        // -------------------------------------------------------------
        console.log("\n[Test 3/9] Verifying Centralized Error Handling & 404 Handler...");
        const res404 = await fetch(`${BASE_URL}/api/nonexistent-route-xyz`, {
            headers: { "x-test-bypass": "farmlink-test" }
        });
        assert.strictEqual(res404.status, 404, "Undefined route should return 404");
        const body404 = await res404.json();
        assert.strictEqual(body404.success, false);
        assert(body404.message.includes("Route not found"), "404 message should be structured JSON");

        // Test CastError handling (invalid ObjectId param)
        const resCast = await fetch(`${BASE_URL}/api/group/invalid-object-id-123`, {
            method: "POST",
            headers: { "x-test-bypass": "farmlink-test" }
        });
        assert.strictEqual(resCast.status, 400, "Invalid ObjectId param should return 400");
        const bodyCast = await resCast.json();
        assert.strictEqual(bodyCast.success, false);
        assert(bodyCast.message.includes("valid"), "Validation error message returned for invalid param");
        console.log("  ✓ Centralized 404 and bad parameter error formatting verified.");

        // -------------------------------------------------------------
        // Test 4: Request Validation
        // -------------------------------------------------------------
        console.log("\n[Test 4/9] Verifying Schema-based Request Validation...");
        const resVal = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-test-bypass": "farmlink-test" },
            body: JSON.stringify({ email: "not-an-email", password: "" })
        });
        assert.strictEqual(resVal.status, 400, "Invalid payload must return 400");
        const bodyVal = await resVal.json();
        assert.strictEqual(bodyVal.success, false);
        assert(bodyVal.message.length > 0, "Validation failure returns informative message");
        console.log("  ✓ Request validation successfully rejects invalid payload schemas with 400.");

        // -------------------------------------------------------------
        // Test 5: Authentication & JWT Claims
        // -------------------------------------------------------------
        console.log("\n[Test 5/9] Verifying Authentication & Claims Normalization...");
        // Authenticate demo shopkeeper
        const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-test-bypass": "farmlink-test" },
            body: JSON.stringify({
                email: "shopkeeper@farmlink.com",
                password: "FarmLink123"
            })
        });
        assert.strictEqual(resLogin.status, 200, "Demo login should succeed");
        const loginData = await resLogin.json();
        assert(loginData.token, "Access token returned");

        // Verify decoded token claims
        const decoded = jwt.decode(loginData.token);
        assert(decoded.userId, "Token claims must contain userId");
        assert(decoded.user, "Token claims must contain user for backward compatibility");
        assert.strictEqual(decoded.role, "shopkeeper", "Token claims must contain correct role");
        console.log("  ✓ Authentication and claims normalization (userId & user) verified.");

        // -------------------------------------------------------------
        // Test 6: Refresh Token Rotation & Invalidation
        // -------------------------------------------------------------
        console.log("\n[Test 6/9] Verifying Refresh Token Rotation...");
        const cookies = resLogin.headers.get("set-cookie");
        let cookieHeader = "";
        if (cookies) {
            cookieHeader = cookies.split(";")[0];
        }

        // Call /refresh with cookie
        const resRefresh = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: {
                Cookie: cookieHeader,
                "x-test-bypass": "farmlink-test"
            }
        });
        assert.strictEqual(resRefresh.status, 200, "Refresh token request should succeed");
        const refreshData = await resRefresh.json();
        assert(refreshData.accessToken, "New access token must be returned");

        // Verify that the old refresh token is now rotated and cannot be reused
        const resOldRefresh = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: {
                Cookie: cookieHeader, // Old cookie
                "x-test-bypass": "farmlink-test"
            }
        });
        assert.strictEqual(resOldRefresh.status, 401, "Old rotated refresh token must be rejected with 401");
        console.log("  ✓ Refresh token rotation and old token invalidation verified.");

        // -------------------------------------------------------------
        // Test 7: Webhook Idempotency & Deduplication
        // -------------------------------------------------------------
        console.log("\n[Test 7/9] Verifying Webhook Idempotency & Duplicate Message Handling...");
        const testMessageSid = `SM_TEST_HARDENING_${Date.now()}`;
        const webhookPayload = new URLSearchParams({
            MessageSid: testMessageSid,
            From: "+919876543210",
            Body: "Mujhe 10kg gehu chahiye"
        });

        // First webhook delivery
        const resWebhook1 = await fetch(`${BASE_URL}/api/webhooks/twilio`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "x-test-bypass": "farmlink-test"
            },
            body: webhookPayload.toString()
        });
        assert.strictEqual(resWebhook1.status, 200, "First webhook delivery should succeed");
        const xml1 = await resWebhook1.text();
        assert(xml1.includes("<Response>"), "Webhook returns TwiML response");

        // Second webhook delivery with identical MessageSid (simulating Twilio retry)
        const resWebhook2 = await fetch(`${BASE_URL}/api/webhooks/twilio`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "x-test-bypass": "farmlink-test"
            },
            body: webhookPayload.toString()
        });
        assert.strictEqual(resWebhook2.status, 200, "Duplicate webhook delivery should return 200 OK");
        const xml2 = await resWebhook2.text();
        assert(xml2.includes("<Response>"), "Duplicate webhook returns cached/safe TwiML response");

        // Verify ProcessedWebhook record in MongoDB
        const processed = await ProcessedWebhook.findOne({ messageSid: testMessageSid });
        assert(processed, "ProcessedWebhook record must exist in MongoDB");
        assert.strictEqual(processed.status, "COMPLETED", "ProcessedWebhook status must be COMPLETED");

        // Cleanup test webhook record
        await ProcessedWebhook.deleteOne({ messageSid: testMessageSid });
        console.log("  ✓ Webhook idempotency and duplicate deduplication verified.");

        // -------------------------------------------------------------
        // Test 8: RBAC Security Boundaries
        // -------------------------------------------------------------
        console.log("\n[Test 8/9] Verifying RBAC Security Boundaries...");
        const adminSecret = process.env.JWT_SECRET;
        const fakeAdminToken = jwt.sign({ userId: new mongoose.Types.ObjectId(), role: "admin" }, adminSecret);
        const shopkeeperToken = loginData.token;

        // Shopkeeper attempting admin endpoint -> 403
        const resShopOnAdmin = await fetch(`${BASE_URL}/api/admin/dashboard`, {
            headers: { Authorization: `Bearer ${shopkeeperToken}`, "x-test-bypass": "farmlink-test" }
        });
        assert.strictEqual(resShopOnAdmin.status, 403, "Shopkeeper on admin endpoint must return 403");

        // Admin accessing admin endpoint -> 200
        const resAdminOnAdmin = await fetch(`${BASE_URL}/api/admin/dashboard`, {
            headers: { Authorization: `Bearer ${fakeAdminToken}`, "x-test-bypass": "farmlink-test" }
        });
        assert.strictEqual(resAdminOnAdmin.status, 200, "Admin on admin endpoint must return 200");
        console.log("  ✓ RBAC boundaries strictly enforced across roles.");

        // -------------------------------------------------------------
        // Test 9: Rate Limiting Headers
        // -------------------------------------------------------------
        console.log("\n[Test 9/9] Verifying Rate Limiting Headers...");
        const resRate = await fetch(`${BASE_URL}/api/demo/status`);
        const limitHeader = resRate.headers.get("ratelimit-limit");
        const remainingHeader = resRate.headers.get("ratelimit-remaining");
        assert(limitHeader !== null, "RateLimit-Limit header must be present on standard requests");
        assert(remainingHeader !== null, "RateLimit-Remaining header must be present on standard requests");
        console.log(`  ✓ Rate limiting headers confirmed: Limit = ${limitHeader}, Remaining = ${remainingHeader}`);

        console.log("\n===============================================================");
        console.log("  ALL PRODUCTION HARDENING VERIFICATION TESTS PASSED!          ");
        console.log("===============================================================");

    } finally {
        await stopTestServer();
    }
}

if (require.main === module) {
    runVerification()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("\n❌ Verification Failed:", err);
            process.exit(1);
        });
}

module.exports = runVerification;
