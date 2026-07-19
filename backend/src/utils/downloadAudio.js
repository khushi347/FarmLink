const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");

async function fetchArrayBufferCompat(mediaUrl, headers = {}) {
  if (typeof fetch === "function") {
    try {
      const res = await fetch(mediaUrl, { headers });
      const contentType = res.headers.get("content-type") || "";
      const status = res.status;
      const ok = res.ok;
      const arrayBuffer = await res.arrayBuffer();
      return { buffer: Buffer.from(arrayBuffer), contentType, status, ok };
    } catch (err) {
      console.warn("global fetch failed, falling back to http/https:", err && err.message);
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const u = new URL(mediaUrl);
      const lib = u.protocol === "https:" ? https : http;
      const opts = {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname + u.search,
        method: "GET",
        headers,
      };

      const req = lib.request(opts, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers["content-type"] || "";
          resolve({
            buffer,
            contentType,
            status: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 300,
          });
        });
      });

      req.on("error", reject);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

const downloadAudio = async (mediaUrl, fileName) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  }

  const authHeader =
    "Basic " +
    Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");

  const { buffer, contentType, status, ok } = await fetchArrayBufferCompat(mediaUrl, {
    Authorization: authHeader,
    Accept: "*/*",
  });

  console.log("Download status:", status, "content-type:", contentType);

  if (!ok) {
    let bodyPreview = "<binary>";
    try {
      bodyPreview = buffer.toString("utf8");
    } catch (e) {
      // ignore
    }
    throw new Error(`Twilio Media Download Failed: status=${status} body=${bodyPreview}`);
  }

  const ct = (contentType || "").toLowerCase();
  if (ct.includes("xml") || ct.includes("html") || ct.includes("json")) {
    const bodyText = buffer.toString("utf8").slice(0, 2000);
    throw new Error(`Unexpected content-type when downloading media: ${contentType} body=${bodyText}`);
  }

  const uploadDir = path.join(__dirname, "../uploads");
  await fsp.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, fileName);
  await fsp.writeFile(filePath, buffer);

  const stats = await fsp.stat(filePath);
  console.log("Saved:", filePath, "Size:", stats.size, "bytes");

  return filePath;
};

module.exports = downloadAudio;
