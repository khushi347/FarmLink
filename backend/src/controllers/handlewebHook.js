const downloadAudio = require("../utils/downloadAudio");
const { speechToText } = require("../services/speechService");
const extractOrder  = require("../services/geminiService");

const handlewebHook = async (req, res) => {
    try {
        console.log(req.body);

        if (req.body.MediaContentType0?.startsWith("audio")) {

            const mediaUrl = req.body.MediaUrl0;

            const filePath = await downloadAudio(
                mediaUrl,
                `${Date.now()}.ogg`
            );

            console.log("Voice saved at:", filePath);

            const transcript = await speechToText(filePath);
            const order = await extractOrder(transcript);

            console.log(order);
        }

        res.sendStatus(200);

    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
};

module.exports = handlewebHook;