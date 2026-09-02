const mongoose = require("mongoose");
const Shop = require("../models/Shop");
const User = require("../models/User");

const seedShops = async () => {
    try {
        const count = await Shop.countDocuments();
        if (count > 0) {
            console.log(`Shops already exist (${count} shops found).`);
            return;
        }

        const shopkeepers = await User.find({ role: "shopkeeper" });
        if (shopkeepers.length === 0) {
            console.log("No shopkeeper users found to associate with shops.");
            return;
        }

        const sampleShops = [
            {
                shopName: "Kisan Krishi Kendra",
                owner: shopkeepers[0]._id,
                category: ["Seeds", "Fertilizer", "Pesticides"],
                phone: "+91 98120 12345",
                village: "Bhopal Central / Kolar Hub",
                location: {
                    type: "Point",
                    coordinates: [77.4200, 23.2650] // [lng, lat]
                }
            },
            {
                shopName: "Green Valley Agro Store",
                owner: shopkeepers[1]?._id || shopkeepers[0]._id,
                category: ["Fertilizer", "Machinery", "Seeds"],
                phone: "+91 94162 54321",
                village: "Arera Sector Hub",
                location: {
                    type: "Point",
                    coordinates: [77.4450, 23.2550]
                }
            },
            {
                shopName: "Mohan Agro Mart",
                owner: shopkeepers[2]?._id || shopkeepers[0]._id,
                category: ["Pesticides", "Tractor Rental", "Water Tanker"],
                phone: "+91 97291 98765",
                village: "Hoshangabad Road Corridor",
                location: {
                    type: "Point",
                    coordinates: [77.4600, 23.2800]
                }
            }
        ];

        await Shop.insertMany(sampleShops);
        console.log(`Successfully seeded ${sampleShops.length} Retail Partner Shops.`);
    } catch (error) {
        console.error("Error seeding shops:", error);
        throw error;
    }
};

module.exports = seedShops;
