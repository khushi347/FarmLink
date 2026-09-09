const analyticsService = require("../services/analyticsService");

/**
 * GET /api/analytics/platform
 * Admin RBAC protected platform-level analytics and time-series
 */
const getPlatform = async (req, res) => {
    try {
        const { days, isDemo } = req.query;
        const data = await analyticsService.getPlatformAnalytics({
            days: days ? parseInt(days, 10) : 14,
            isDemo: isDemo === "true",
        });

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Error in getPlatform analytics:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve platform analytics",
            error: error.message,
        });
    }
};

/**
 * GET /api/analytics/logistics
 * Admin RBAC protected logistics metrics, distances, and savings
 */
const getLogistics = async (req, res) => {
    try {
        const { isDemo } = req.query;
        const data = await analyticsService.getLogisticsAnalytics({
            isDemo: isDemo === "true",
        });

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Error in getLogistics analytics:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve logistics analytics",
            error: error.message,
        });
    }
};

module.exports = {
    getPlatform,
    getLogistics,
};
