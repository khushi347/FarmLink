/**
 * demoScenarioController.js — Controller for Recruiter-Facing Demo Scenarios
 *
 * Exposes endpoints for executing Scenarios 1–4 using real services and DB records.
 */

const demoScenarioService = require("../services/demoScenarioService");

/**
 * POST /api/demo/scenarios/ai-order
 * Body: { text: string, sessionId: string }
 */
const handleAiOrder = async (req, res) => {
    try {
        const { text, sessionId } = req.body || {};
        if (!text || !sessionId) {
            return res.status(400).json({
                success: false,
                message: "text and sessionId are required",
            });
        }
        const result = await demoScenarioService.runAiOrderScenario({ text, sessionId });
        return res.status(200).json(result);
    } catch (error) {
        console.error("[demoScenarioController] handleAiOrder error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to process AI order scenario",
        });
    }
};

/**
 * POST /api/demo/scenarios/shared-delivery
 * Body: { sessionId: string }
 */
const handleSharedDelivery = async (req, res) => {
    try {
        const { sessionId } = req.body || {};
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "sessionId is required",
            });
        }
        const result = await demoScenarioService.runSharedDeliveryScenario({ sessionId });
        return res.status(200).json(result);
    } catch (error) {
        console.error("[demoScenarioController] handleSharedDelivery error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to process shared delivery grouping scenario",
        });
    }
};

/**
 * POST /api/demo/scenarios/shop-competition
 * Body: { sessionId: string }
 */
const handleShopCompetition = async (req, res) => {
    try {
        const { sessionId } = req.body || {};
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "sessionId is required",
            });
        }
        const result = await demoScenarioService.runShopCompetitionScenario({ sessionId });
        return res.status(200).json(result);
    } catch (error) {
        console.error("[demoScenarioController] handleShopCompetition error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to execute shop competition scenario",
        });
    }
};

/**
 * POST /api/demo/scenarios/realtime-notification
 * Body: { sessionId: string }
 */
const handleRealtimeNotification = async (req, res) => {
    try {
        const { sessionId } = req.body || {};
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "sessionId is required",
            });
        }
        const result = await demoScenarioService.runRealtimeNotificationScenario({ sessionId });
        return res.status(200).json(result);
    } catch (error) {
        console.error("[demoScenarioController] handleRealtimeNotification error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to execute realtime notification scenario",
        });
    }
};

/**
 * DELETE /api/demo/scenarios/reset
 * Body or query: { sessionId: string }
 */
const handleReset = async (req, res) => {
    try {
        const sessionId = (req.body && req.body.sessionId) || req.query.sessionId;
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "sessionId is required",
            });
        }
        const result = await demoScenarioService.resetSessionScenarioData(sessionId);
        return res.status(200).json(result);
    } catch (error) {
        console.error("[demoScenarioController] handleReset error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to reset scenario data",
        });
    }
};

/**
 * GET /api/demo/scenarios/presets
 */
const getPresets = async (req, res) => {
    return res.status(200).json({
        success: true,
        presets: demoScenarioService.SCENARIO_PRESETS,
    });
};

module.exports = {
    handleAiOrder,
    handleSharedDelivery,
    handleShopCompetition,
    handleRealtimeNotification,
    handleReset,
    getPresets,
};
