require("dotenv").config();

const path = require("path");
const { speechToText } = require("./src/services/speechService");

async function test() {
    try {
        const filePath = path.join(
            __dirname,
            "src",
            "uploads",
            "1783954149756.ogg"
        );

        console.log("Testing file:", filePath);

        const transcript = await speechToText(filePath);

        console.log("\n Transcript:");
        console.log(transcript);

    } catch (err) {
        console.error("\n Error:");
        console.error(err);
    }
}

test();