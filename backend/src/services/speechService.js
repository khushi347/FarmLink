const { SarvamAIClient } = require("sarvamai");
const fs = require("fs");

const client = new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY,
});

async function speechToText(filePath) {

    const response = await client.speechToText.transcribe({
        file:fs.createReadStream(filePath),
        model: "saaras:v3",
        mode: "transcribe",
    });

    return response.transcript;
}

module.exports = { speechToText };