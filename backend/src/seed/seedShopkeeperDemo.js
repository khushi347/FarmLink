/**
 * seedShopkeeperDemo.js
 * Delegated bridge to Module 21 reusable demo seed infrastructure (demoSeedService.js).
 * Configures realistic demo data for the Shopkeeper Portal (shopkeeper@farmlink.com).
 * All records strictly tagged with isDemo: true to prevent any pollution of real data.
 */

const { seedShopkeeperPortalDemo } = require("../services/demoSeedService");

const seedShopkeeperDemo = async (options = {}) => {
    return seedShopkeeperPortalDemo({
        userEmail: options.userEmail || "shopkeeper@farmlink.com",
    });
};

module.exports = seedShopkeeperDemo;
