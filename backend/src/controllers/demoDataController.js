/**
 * demoDataController.js — Controller for Demo Data & Seed Management
 *
 * Exposes endpoints for:
 *  - Loading deterministic logistics scenario for a visitor session
 *  - Safely resetting demo data (session-scoped vs protected global)
 *  - Fetching summary stats for demo entities
 */

const demoSeedService = require("../services/demoSeedService");

/**
 * POST /api/demo/data/load-logistics
 * Injects a reproducible 19-order, 3-TripBlock logistics scenario
 * scoped to the caller's demoSessionId.
 */
const loadLogisticsScenario = async (req, res) => {
    try {
        const sessionId = (req.body && req.body.sessionId) || req.query.sessionId;

        if (!sessionId || typeof sessionId !== "string" || sessionId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "sessionId is required to load a session-scoped logistics scenario.",
            });
        }

        const result = await demoSeedService.seedLogisticsScenario({
            sessionId: sessionId.trim(),
        });

        return res.status(201).json(result);
    } catch (error) {
        console.error("[DemoDataController] Error loading logistics scenario:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load logistics scenario",
            error: error.message,
        });
    }
};

/**
 * POST /api/demo/data/reset
 * STRICT Session-Scoped Reset.
 * Only wipes records with { isDemo: true, demoSessionId: sessionId }.
 */
const resetSessionData = async (req, res) => {
    try {
        const sessionId = (req.body && req.body.sessionId) || req.query.sessionId;

        if (!sessionId || typeof sessionId !== "string" || sessionId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "sessionId is required to reset session demo data.",
            });
        }

        const result = await demoSeedService.resetSessionData(sessionId.trim());
        return res.status(200).json(result);
    } catch (error) {
        console.error("[DemoDataController] Error resetting session demo data:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reset session demo data",
            error: error.message,
        });
    }
};

/**
 * POST /api/demo/data/reset-global
 * Protected Global Development Reset (Admin only).
 * Cleans baseline development records ({ isDemo: true, demoSessionId: null }).
 */
const resetGlobalData = async (req, res) => {
    try {
        const result = await demoSeedService.resetGlobalDemoData();
        return res.status(200).json(result);
    } catch (error) {
        console.error("[DemoDataController] Error in global demo reset:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reset global demo data",
            error: error.message,
        });
    }
};

/**
 * GET /api/demo/data/summary
 * Returns counts of demo orders and trips by lifecycle state.
 */
const getSummary = async (req, res) => {
    try {
        const { sessionId } = req.query;
        const result = await demoSeedService.getDemoDataSummary(sessionId || null);
        return res.status(200).json(result);
    } catch (error) {
        console.error("[DemoDataController] Error retrieving demo summary:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve demo summary",
            error: error.message,
        });
    }
};

module.exports = {
    loadLogisticsScenario,
    resetSessionData,
    resetGlobalData,
    getSummary,
};
