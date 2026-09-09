const assistantContextService = require("../services/assistantContextService");
const aiAssistantService = require("../services/aiAssistantService");
const Shop = require("../models/Shop");
const User = require("../models/User");

/**
 * POST /api/ai/assistant
 * Role-aware natural-language operations query and recommendation engine
 */
const handleAssistantQuery = async (req, res) => {
    try {
        const { question } = req.body;

        if (!question || typeof question !== "string" || question.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide a natural-language question string.",
            });
        }

        const userRole = req.user.role;
        const userId = req.user.userId || req.user.user;
        const isDemo = Boolean(req.user.isDemo || req.user.demo);

        let structuredContext = null;

        // 1. Role-aware context scoping
        if (userRole === "admin") {
            structuredContext = await assistantContextService.getAdminStructuredContext(isDemo);
        } else if (userRole === "shopkeeper") {
            const shop = await Shop.findOne({ owner: userId });
            if (!shop) {
                return res.status(403).json({
                    success: false,
                    message: "No registered shop found for this shopkeeper account.",
                });
            }
            structuredContext = await assistantContextService.getShopkeeperStructuredContext(shop._id, isDemo);
        } else {
            return res.status(403).json({
                success: false,
                message: "Unauthorized role for AI Operations Assistant",
            });
        }

        // 2. Query assistant (Gemini LLM with deterministic fallback)
        const result = await aiAssistantService.queryAssistant({
            question: question.trim(),
            structuredContext,
            userRole,
        });

        return res.status(200).json({
            success: true,
            data: {
                question: question.trim(),
                answer: result.answer,
                source: result.source,
                recommendations: result.recommendations || [],
                structuredContext: result.structuredContext,
            },
        });
    } catch (error) {
        console.error("Error in handleAssistantQuery:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process operational query",
            error: error.message,
        });
    }
};

module.exports = {
    handleAssistantQuery,
};
