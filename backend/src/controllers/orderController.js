const buildOrder = require("../services/orderService");

const createOrder = async (req, res) => {
    try {

        const {
            farmerId,
            aiData,
            transcript,
            audioUrl,
            location
        } = req.body;

        const order = await buildOrder({
            farmerId,
            aiData,
            transcript,
            audioUrl,
            location
        });

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

module.exports = {createOrder};