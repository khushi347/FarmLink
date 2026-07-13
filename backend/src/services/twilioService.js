const fs = require("fs");
const path = require("path");

const downloadMedia = async (mediaUrl, fileName) => {
  const response = await fetch(mediaUrl, {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64"),
    },
  });

  const buffer = Buffer.from(await response.arrayBuffer());

  const filePath = path.join(__dirname, "../uploads", fileName);

  fs.writeFileSync(filePath, buffer);

  return filePath;
};

module.exports =downloadMedia;