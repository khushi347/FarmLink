const Order = require("../models/Order");

const buildOrder = async ({
    farmerId,
    aiData,
    transcript,
    audioUrl,
    location
}) => {

    const { products, deliveryDate } = aiData;

    if (!farmerId) {
        throw new Error("Farmer ID is required.");
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new Error("Order must contain at least one product.");
    }

    if (
        !location ||
        !Array.isArray(location.coordinates) ||
        location.coordinates.length !== 2
    ) {
        throw new Error("Valid location is required.");
    }

    if (!audioUrl) {
        throw new Error("Audio URL is required.");
    }

    if (!transcript || transcript.trim() === "") {
        throw new Error("Transcript is required.");
    }

    const orderData = {
        farmer: farmerId,
        products,
        location,
        requestedDate: deliveryDate || null,
        transcript,
        audioUrl,
        status: "Pending"
    };

    const order = await Order.create(orderData);

    return order;
};

module.exports = buildOrder;