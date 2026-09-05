/**
 * seedShopkeeperDemo.js
 * Creates isolated demo environment for Module 14 — Shopkeeper Dashboard.
 * All records strictly tagged with isDemo: true to prevent any pollution with real data.
 */

const User = require("../models/User");
const Shop = require("../models/Shop");
const Farmer = require("../models/Farmer");
const Order = require("../models/Order");
const TripBlock = require("../models/TripBlock");
const Notification = require("../models/Notification");

const DEMO_SHOPKEEPER_EMAIL = "demo.shopkeeper@farmlink.local";
const DEMO_PASSWORD = "Shopkeeper123!";

const seedShopkeeperDemo = async () => {
    try {
        console.log("[Demo Seeder] Setting up isolated demo shopkeeper dataset...");

        // 1. Ensure Demo Shopkeeper User
        let user = await User.findOne({ email: DEMO_SHOPKEEPER_EMAIL });
        if (!user) {
            user = await User.create({
                name: "Kisan Sharma",
                email: DEMO_SHOPKEEPER_EMAIL,
                password: DEMO_PASSWORD,
                role: "shopkeeper",
                isDemo: true,
            });
            console.log("[Demo Seeder] Created demo shopkeeper user:", DEMO_SHOPKEEPER_EMAIL);
        } else {
            user.isDemo = true;
            user.role = "shopkeeper";
            await user.save();
        }

        // 2. Ensure Demo Shop
        let shop = await Shop.findOne({ owner: user._id, isDemo: true });
        if (!shop) {
            shop = await Shop.create({
                shopName: "Kisan Krishi Kendra (Demo)",
                owner: user._id,
                category: ["Seeds", "Fertilizer", "Pesticides", "Machinery"],
                phone: "+91 98000 00014",
                village: "Rampura",
                location: {
                    type: "Point",
                    coordinates: [77.4200, 23.2650], // [lng, lat]
                },
                isDemo: true,
            });
            console.log("[Demo Seeder] Created demo shop: Kisan Krishi Kendra (Demo)");
        } else {
            shop.shopName = "Kisan Krishi Kendra (Demo)";
            await shop.save();
        }

        // 3. Clear existing demo trips, orders, farmers, and notifications for clean state
        // Only removes records with isDemo: true associated with this demo shopkeeper or unassigned demo trips
        await TripBlock.deleteMany({ isDemo: true, demoSessionId: null });
        await Order.deleteMany({ isDemo: true, demoSessionId: null });
        await Farmer.deleteMany({ isDemo: true, demoSessionId: null });
        await Notification.deleteMany({ isDemo: true, user: user._id });

        // 4. Create Demo Farmers
        const farmerDefs = [
            { name: "Ramlal Gurjar", village: "Rampura", phone: "+91 98260 11001", lng: 77.4120, lat: 23.2600 },
            { name: "Shivraj Meena", village: "Bilkisganj", phone: "+91 98260 11002", lng: 77.3820, lat: 23.2180 },
            { name: "Devendra Singh", village: "Phanda Hub", phone: "+91 98260 11003", lng: 77.4420, lat: 23.2750 },
            { name: "Kamal Patel", village: "Berasia Corridor", phone: "+91 98260 11004", lng: 77.4560, lat: 23.3220 },
            { name: "Anandi Bai", village: "Kolar Hub", phone: "+91 98260 11005", lng: 77.4110, lat: 23.2420 },
            { name: "Mohanlal Rajput", village: "Sehore East", phone: "+91 98260 11006", lng: 77.3500, lat: 23.2000 },
        ];

        const createdFarmers = {};
        for (const f of farmerDefs) {
            const farmer = await Farmer.create({
                name: f.name,
                whatsappNumber: f.phone,
                language: "Hindi",
                isDemo: true,
            });
            createdFarmers[f.village] = { farmer, lng: f.lng, lat: f.lat };
        }

        // Helper to generate demo orders
        const createDemoOrders = async (itemsCount, village, serviceType, status, assignedShopId) => {
            const fInfo = createdFarmers[village] || createdFarmers["Rampura"];
            const orderIds = [];
            for (let i = 0; i < itemsCount; i++) {
                const order = await Order.create({
                    farmer: fInfo.farmer._id,
                    serviceType,
                    products: [
                        {
                            name: serviceType === "Seeds" ? "Paddy Seeds (Hybrid)" : serviceType === "Fertilizer" ? "Urea Bag 50kg" : "Organic Bio-Pesticide",
                            quantity: (i + 1) * 25,
                            unit: "kg",
                        },
                    ],
                    location: {
                        type: "Point",
                        coordinates: [fInfo.lng + (i * 0.002), fInfo.lat + (i * 0.002)],
                    },
                    requestedDate: new Date(Date.now() + 86400000),
                    transcript: `${serviceType} order for ${village} field cluster`,
                    status: status || "Grouped",
                    assignedShop: assignedShopId || null,
                    isDemo: true,
                });
                orderIds.push(order._id);
            }
            return orderIds;
        };

        // 5. Seed Demo TripBlocks

        // Trip 1: OPEN Available Trip in Rampura (Trip #245)
        const trip1Orders = await createDemoOrders(6, "Rampura", "Seeds", "Grouped", null);
        const trip1 = await TripBlock.create({
            orders: trip1Orders,
            serviceType: "Seeds",
            assignedShop: null,
            scheduledDate: new Date(Date.now() + 86400000),
            status: "OPEN",
            estimatedEarnings: 850,
            centerLocation: {
                type: "Point",
                coordinates: [77.4080, 23.2580], // ~18.4 km simulated corridor
            },
            isDemo: true,
        });

        // Trip 2: OPEN Available Trip in Bilkisganj (Trip #248)
        const trip2Orders = await createDemoOrders(4, "Bilkisganj", "Fertilizer", "Grouped", null);
        const trip2 = await TripBlock.create({
            orders: trip2Orders,
            serviceType: "Fertilizer",
            assignedShop: null,
            scheduledDate: new Date(Date.now() + 90000000),
            status: "OPEN",
            estimatedEarnings: 620,
            centerLocation: {
                type: "Point",
                coordinates: [77.3820, 23.2180], // ~12.8 km
            },
            isDemo: true,
        });

        // Trip 3: OPEN Available Trip in Berasia Corridor (Trip #252)
        const trip3Orders = await createDemoOrders(8, "Berasia Corridor", "Pesticides", "Grouped", null);
        const trip3 = await TripBlock.create({
            orders: trip3Orders,
            serviceType: "Pesticides",
            assignedShop: null,
            scheduledDate: new Date(Date.now() + 100000000),
            status: "OPEN",
            estimatedEarnings: 1200,
            centerLocation: {
                type: "Point",
                coordinates: [77.4560, 23.3220], // ~24.1 km
            },
            isDemo: true,
        });

        // Trip 4: CLAIMED / Active Trip assigned to Demo Shop (Trip #239)
        const trip4Orders = await createDemoOrders(5, "Kolar Hub", "Seeds", "Accepted", shop._id);
        const trip4 = await TripBlock.create({
            orders: trip4Orders,
            serviceType: "Seeds",
            assignedShop: shop._id,
            scheduledDate: new Date(Date.now() + 40000000),
            status: "CLAIMED",
            claimedAt: new Date(Date.now() - 3600000),
            estimatedEarnings: 740,
            centerLocation: {
                type: "Point",
                coordinates: [77.4110, 23.2420], // ~15.2 km
            },
            isDemo: true,
        });

        // Trip 5: COMPLETED Trip assigned to Demo Shop (Trip #220)
        const trip5Orders = await createDemoOrders(5, "Sehore East", "Fertilizer", "Completed", shop._id);
        const trip5 = await TripBlock.create({
            orders: trip5Orders,
            serviceType: "Fertilizer",
            assignedShop: shop._id,
            scheduledDate: new Date(Date.now() - 86400000),
            status: "COMPLETED",
            claimedAt: new Date(Date.now() - 90000000),
            completedAt: new Date(Date.now() - 86400000),
            estimatedEarnings: 890,
            centerLocation: {
                type: "Point",
                coordinates: [77.3500, 23.2000], // ~19.5 km
            },
            isDemo: true,
        });

        // Trip 6: COMPLETED Trip assigned to Demo Shop (Trip #214)
        const trip6Orders = await createDemoOrders(4, "Phanda Hub", "Seeds", "Completed", shop._id);
        const trip6 = await TripBlock.create({
            orders: trip6Orders,
            serviceType: "Seeds",
            assignedShop: shop._id,
            scheduledDate: new Date(Date.now() - 172800000),
            status: "COMPLETED",
            claimedAt: new Date(Date.now() - 176400000),
            completedAt: new Date(Date.now() - 172800000),
            estimatedEarnings: 580,
            centerLocation: {
                type: "Point",
                coordinates: [77.4420, 23.2750], // ~11.2 km
            },
            isDemo: true,
        });

        // 6. Seed Demo Notifications
        const notifications = [
            {
                user: user._id,
                title: "New TripBlock Available",
                message: "TripBlock in Rampura corridor is open for claiming (6 orders · ₹850 estimated earnings).",
                type: "TripBlock",
                isRead: false,
                isDemo: true,
                metadata: { tripId: trip1._id, corridor: "Rampura", earnings: 850 },
            },
            {
                user: user._id,
                title: "Trip Claim Confirmed",
                message: "TripBlock in Kolar Hub has been successfully locked and assigned to your shop.",
                type: "TripBlock",
                isRead: true,
                isDemo: true,
                metadata: { tripId: trip4._id, corridor: "Kolar Hub", earnings: 740 },
            },
            {
                user: user._id,
                title: "Payout Credited",
                message: "₹890 payout for completed delivery in Sehore East has been cleared.",
                type: "System",
                isRead: true,
                isDemo: true,
                metadata: { tripId: trip5._id, earnings: 890 },
            },
            {
                user: user._id,
                title: "Payout Credited",
                message: "₹580 payout for completed delivery in Phanda Hub has been cleared.",
                type: "System",
                isRead: true,
                isDemo: true,
                metadata: { tripId: trip6._id, earnings: 580 },
            },
        ];

        await Notification.insertMany(notifications);

        console.log("[Demo Seeder] Successfully seeded isolated demo shopkeeper dataset:");
        console.log(` - Demo User: ${DEMO_SHOPKEEPER_EMAIL} (Password: ${DEMO_PASSWORD})`);
        console.log(` - Demo Shop: ${shop.shopName} (${shop.village})`);
        console.log(" - Available Trips: 3 (Rampura ₹850, Bilkisganj ₹620, Berasia ₹1200)");
        console.log(" - Active Trips: 1 (Kolar Hub ₹740)");
        console.log(" - Completed Trips: 2 (Sehore East ₹890, Phanda Hub ₹580) -> Revenue: ₹1470");
        console.log(" - Demo Notifications: 4");

        return {
            user,
            shop,
            trips: [trip1, trip2, trip3, trip4, trip5, trip6],
        };
    } catch (error) {
        console.error("[Demo Seeder] Error seeding shopkeeper demo:", error);
        throw error;
    }
};

module.exports = seedShopkeeperDemo;
