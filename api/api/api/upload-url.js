export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({ error: "BLOB_READ_WRITE_TOKEN missing" });
    }

    const body = await readJson(req);
    const { filename, contentType } = body || {};
    if (!filename) return res.status(400).json({ error: "filename required" });

    // Ask Vercel Blob for a one-time upload URL
    const r = await fetch("https://api.vercel.com/v2/blob/generate-upload-url", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: "blob generate-upload-url failed", detail: t });
    }
    const { url: uploadUrl } = await r.json();

    // We'll write under a prefix for easier listing
    const key = `materials/${Date.now()}-${sanitize(filename)}`;

    return res.status(200).json({ uploadUrl, key, contentType: contentType || "application/octet-stream" });
  } catch (e) {
    console.error("upload-url error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}

function sanitize(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-");
}

async function readJson(req) {
  const raw = await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
  return raw ? JSON.parse(raw) : {};
}
