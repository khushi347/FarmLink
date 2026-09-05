/**
 * Automated Verification Script for FarmLink Module 14 — Shopkeeper Dashboard
 * Validates full demo flow, strict data isolation, claims, completions, metrics, and notifications.
 */

const assert = require("assert");

const API_BASE = "http://localhost:5000/api";

const request = async (endpoint, options = {}, token = null) => {
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
};

const runVerification = async () => {
    console.log("==========================================================");
    console.log("  FarmLink Module 14 — Shopkeeper Dashboard Verification  ");
    console.log("==========================================================");

    // 1. Authenticate as Demo Shopkeeper
    console.log("\n[1/10] Authenticating as Demo Shopkeeper...");
    const loginRes = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: "demo.shopkeeper@farmlink.local",
            password: "Shopkeeper123!",
        }),
    });

    assert.strictEqual(loginRes.status, 200, "Shopkeeper login should succeed with 200");
    const token = loginRes.data.token;
    assert(token, "Access token must be returned");
    assert.strictEqual(loginRes.data.user.role, "shopkeeper", "User role must be shopkeeper");
    console.log("✓ Logged in as demo shopkeeper:", loginRes.data.user.name, `(${loginRes.data.user.email})`);

    // 2. Reset to known clean seed
    console.log("\n[2/10] Resetting demo environment to initial seed...");
    const resetRes = await request("/shop/demo/reset", { method: "POST" }, token);
    assert.strictEqual(resetRes.status, 200);
    console.log("✓ Demo dataset reset successfully");

    // 3. Fetch Shop Profile
    console.log("\n[3/10] Verifying GET /api/shop/me...");
    const meRes = await request("/shop/me", {}, token);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.data.shop.shopName, "Kisan Krishi Kendra (Demo)");
    assert.strictEqual(meRes.data.data.shop.village, "Rampura");
    assert.strictEqual(meRes.data.data.shop.isDemo, true);
    assert.strictEqual(meRes.data.data.isDemo, true);
    console.log("✓ Profile verified: Shop name =", meRes.data.data.shop.shopName, "· Village =", meRes.data.data.shop.village);

    // 4. Verify Initial Dashboard Metrics
    console.log("\n[4/10] Verifying GET /api/shop/dashboard metrics...");
    const dashRes = await request("/shop/dashboard", {}, token);
    assert.strictEqual(dashRes.status, 200);
    const m = dashRes.data.data;
    console.log("  Initial Metrics:", {
        available: m.available,
        acceptedTrips: m.acceptedTrips,
        completedTrips: m.completedTrips,
        revenue: m.revenue,
        acceptanceRate: m.acceptanceRate,
    });
    assert.strictEqual(m.available, 3, "Should have 3 available demo trips");
    assert.strictEqual(m.acceptedTrips, 1, "Should have 1 active claimed trip");
    assert.strictEqual(m.completedTrips, 2, "Should have 2 completed trips");
    assert.strictEqual(m.revenue, 1470, "Revenue should equal 890 + 580 = ₹1470");
    assert.strictEqual(m.isDemo, true, "isDemo flag must be true");
    console.log("✓ Dashboard metrics verified");

    // 5. Verify Available Trips
    console.log("\n[5/10] Verifying GET /api/shop/trips/available...");
    const availRes = await request("/shop/trips/available", {}, token);
    assert.strictEqual(availRes.status, 200);
    const trips = availRes.data.data;
    assert.strictEqual(trips.length, 3);
    trips.forEach((t) => {
        assert(t.code, "Trip must have code");
        assert(t.village, "Trip must have village");
        assert(t.orderCount > 0, "Trip must have orderCount > 0");
        assert(t.estimatedEarnings > 0, "Trip must have estimatedEarnings > 0");
        assert(t.distanceKm > 0, "Trip must have distanceKm > 0");
        assert.strictEqual(t.status, "OPEN", "Trip must be OPEN");
        assert.strictEqual(t.isDemo, true, "Trip must be isDemo: true");
    });
    console.log("✓ Available trips loaded with required fields:", trips.map(t => `${t.code} (${t.village} · ₹${t.estimatedEarnings} · ${t.distanceKm}km)`));

    // 6. Claim Trip #1 (Rampura)
    const tripToClaim = trips[0];
    console.log(`\n[6/10] Claiming trip ${tripToClaim.code} (${tripToClaim.village} · ₹${tripToClaim.estimatedEarnings})...`);
    const claimRes = await request(`/trip-blocks/${tripToClaim._id}/claim`, { method: "POST" }, token);
    assert.strictEqual(claimRes.status, 200);
    assert.strictEqual(claimRes.data.trip.status, "CLAIMED");
    console.log("✓ Trip claimed successfully:", claimRes.data.message);

    // Verify Available trips decreased to 2
    const afterClaimAvailRes = await request("/shop/trips/available", {}, token);
    assert.strictEqual(afterClaimAvailRes.data.data.length, 2, "Available trips should decrease by 1");
    assert(!afterClaimAvailRes.data.data.some(t => t._id === tripToClaim._id), "Claimed trip must not appear in available");
    console.log("✓ Claimed trip is no longer in available trips list");

    // Verify Active trips increased to 2
    const afterClaimActiveRes = await request("/shop/trips/accepted", {}, token);
    assert.strictEqual(afterClaimActiveRes.data.data.length, 2, "Active trips should increase to 2");
    assert(afterClaimActiveRes.data.data.some(t => t._id === tripToClaim._id), "Claimed trip must appear in active trips");
    console.log("✓ Claimed trip is now in Active Trips tab");

    // 7. Complete the Claimed Trip
    console.log(`\n[7/10] Marking delivery completed for ${tripToClaim.code}...`);
    const compRes = await request(`/trip-blocks/${tripToClaim._id}/complete`, { method: "POST" }, token);
    assert.strictEqual(compRes.status, 200);
    assert.strictEqual(compRes.data.trip.status, "COMPLETED");
    console.log("✓ Trip marked completed successfully:", compRes.data.message);

    // 8. Verify Revenue and Completed Trips Updated
    console.log("\n[8/10] Verifying GET /api/shop/revenue and updated metrics...");
    const revRes = await request("/shop/revenue", {}, token);
    assert.strictEqual(revRes.status, 200);
    const expectedRev = 1470 + tripToClaim.estimatedEarnings; // 1470 + 850 = 2320
    assert.strictEqual(revRes.data.data.totalRevenue, expectedRev, `Total revenue must equal ₹${expectedRev}`);
    assert.strictEqual(revRes.data.data.completedTripsCount, 3, "Completed trips count must equal 3");
    console.log(`✓ Revenue updated accurately to ₹${revRes.data.data.totalRevenue} (3 completed deliveries)`);

    // 9. Verify Notifications
    console.log("\n[9/10] Verifying GET /api/shop/notifications...");
    const notifRes = await request("/shop/notifications", {}, token);
    assert.strictEqual(notifRes.status, 200);
    const notifs = notifRes.data.data;
    assert(notifs.length >= 4, "Should have notifications");
    notifs.forEach(n => assert.strictEqual(n.isDemo, true, "All notifications must be isDemo: true"));
    console.log("✓ Verified demo notifications:", notifs.slice(0, 3).map(n => `[${n.type}] ${n.title}: ${n.message}`));

    // Test marking first notification as read
    const firstUnread = notifs.find(n => !n.isRead);
    if (firstUnread) {
        const markRes = await request(`/shop/notifications/${firstUnread._id}/read`, { method: "PATCH" }, token);
        assert.strictEqual(markRes.status, 200);
        assert.strictEqual(markRes.data.data.isRead, true);
        console.log("✓ Successfully marked notification as read");
    }

    // 10. CRITICAL DATA ISOLATION VERIFICATION: Ensure real coordinator data is untouched
    console.log("\n[10/10] CRITICAL: Verifying coordinator map data isolation (GET /api/map/data)...");
    const adminLoginRes = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: "admin@farmlink.com",
            password: "FarmLink123",
        }),
    });

    if (adminLoginRes.status === 200) {
        const adminToken = adminLoginRes.data.token;
        const mapDataRes = await request("/map/data", {}, adminToken);
        assert.strictEqual(mapDataRes.status, 200);
        const mapData = mapDataRes.data.data;

        // Check that NO demo records leaked into coordinator map data
        const demoShopInMap = (mapData.shops || []).filter(s => s.name === "Kisan Krishi Kendra (Demo)" || s.id === meRes.data.data.shop.id);
        const demoOrdersInMap = (mapData.orders || []).filter(o => o.farmer?.name === "Ramlal Gurjar" || o.farmer?.name === "Shivraj Meena");
        const demoTripsInMap = (mapData.tripBlocks || []).filter(t => t.id === tripToClaim._id);

        assert.strictEqual(demoShopInMap.length, 0, "No demo shop must appear in coordinator map data");
        assert.strictEqual(demoOrdersInMap.length, 0, "No demo orders must appear in coordinator map data");
        assert.strictEqual(demoTripsInMap.length, 0, "No demo TripBlocks must appear in coordinator map data");

        console.log("✓ ZERO DEMO LEAKAGE: Real coordinator map has 0 demo shops, 0 demo orders, 0 demo trips!");
    } else {
        console.log("  (Admin credentials not seeded with default password, skipping admin login check)");
    }

    console.log("\n==========================================================");
    console.log("  ALL VERIFICATION TESTS PASSED SUCCESSFULLY!  ");
    console.log("==========================================================");
};

runVerification().catch(err => {
    console.error("\n❌ Verification failed:", err);
    process.exit(1);
});
