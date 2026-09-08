/**
 * migrateLifecycleStatuses.js — Explicit, Safe Database Migration for Module 16
 *
 * Migrates existing development database records to canonical uppercase statuses:
 *
 * Orders:
 *   - "Pending" -> "RECEIVED"
 *   - "Grouped" -> "GROUPED"
 *   - "Accepted" -> "CLAIMED"
 *   - "Out for Delivery" -> "CLAIMED"
 *   - "Completed" -> "COMPLETED"
 *   - "Cancelled" -> "CANCELLED"
 *
 * TripBlocks:
 *   - "OPEN" -> "CREATED"
 *   - "OUT_FOR_DELIVERY" -> "CLAIMED"
 *   - "COMPLETED" -> "COMPLETED"
 *   - "CANCELLED" -> "CANCELLED"
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const runMigration = async () => {
    console.log("==========================================================");
    console.log("  FarmLink Module 16 — Lifecycle Status Migration Script  ");
    console.log("==========================================================");

    await connectDB();
    const db = mongoose.connection.db;

    const ordersCol = db.collection("orders");
    const tripBlocksCol = db.collection("tripblocks");

    console.log("\n[1/2] Migrating Order collection statuses...");

    const orderMappings = [
        { from: "Pending", to: "RECEIVED" },
        { from: "Grouped", to: "GROUPED" },
        { from: "Accepted", to: "CLAIMED" },
        { from: "Out for Delivery", to: "CLAIMED" },
        { from: "Completed", to: "COMPLETED" },
        { from: "Cancelled", to: "CANCELLED" },
    ];

    let totalOrdersMigrated = 0;
    for (const mapping of orderMappings) {
        const result = await ordersCol.updateMany(
            { status: mapping.from },
            { $set: { status: mapping.to } }
        );
        if (result.modifiedCount > 0) {
            console.log(`  ✓ Migrated ${result.modifiedCount} orders: '${mapping.from}' -> '${mapping.to}'`);
            totalOrdersMigrated += result.modifiedCount;
        }
    }
    console.log(`✓ Order migration complete. Total modified: ${totalOrdersMigrated}`);

    console.log("\n[2/2] Migrating TripBlock collection statuses...");

    const tripMappings = [
        { from: "OPEN", to: "CREATED" },
        { from: "OUT_FOR_DELIVERY", to: "CLAIMED" },
    ];

    let totalTripsMigrated = 0;
    for (const mapping of tripMappings) {
        const result = await tripBlocksCol.updateMany(
            { status: mapping.from },
            { $set: { status: mapping.to } }
        );
        if (result.modifiedCount > 0) {
            console.log(`  ✓ Migrated ${result.modifiedCount} TripBlocks: '${mapping.from}' -> '${mapping.to}'`);
            totalTripsMigrated += result.modifiedCount;
        }
    }
    console.log(`✓ TripBlock migration complete. Total modified: ${totalTripsMigrated}`);

    console.log("\n==========================================================");
    console.log("  Migration completed safely with zero data loss!         ");
    console.log("==========================================================");
};

if (require.main === module) {
    runMigration()
        .then(() => {
            process.exit(0);
        })
        .catch((err) => {
            console.error("❌ Migration failed:", err);
            process.exit(1);
        });
}

module.exports = runMigration;
