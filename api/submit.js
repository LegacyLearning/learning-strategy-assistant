export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({ error: "BLOB_READ_WRITE_TOKEN missing" });
    }
    if (!process.env.ADMIN_TOKEN) {
      return res.status(500).json({ error: "ADMIN_TOKEN missing" });
    }

    const body = await readJson(req);

    // Build record
    const record = {
      client: String(body.client || "").trim(),
      scope: String(body.scope || "").trim(),
      overview: String(body.overview || ""),
      approach: String(body.approach || ""),
      format: String(body.format || ""),
      outcomes: Array.isArray(body.outcomes) ? body.outcomes.map(String) : [],
      modules: Array.isArray(body.modules) ? body.modules.map(String) : [],
      notes: String(body.notes || ""),
      fileUrls: Array.isArray(body.fileUrls) ? body.fileUrls.map(String) : [], // Step 3 updates index.html to send URLs
      status: "submitted",
      created_at: new Date().toISOString(),
    };

    // Create an upload URL
    const up1 = await fetch("https://api.vercel.com/v2/blob/generate-upload-url", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    if (!up1.ok) {
      const t = await up1.text();
      return res.status(502).json({ error: "blob generate-upload-url failed", detail: t });
    }
    const { url: uploadUrl } = await up1.json();

    // Key under submissions/
    const key = `submissions/${Date.now()}-${slug(record.client || "client")}.json`;

    // Upload the JSON to the pre-signed URL
    const payload = JSON.stringify({ key, ...record }, null, 2);
    const up2 = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-vercel-filename": key },
      body: payload,
    });
    if (!up2.ok) {
      const t = await up2.text();
      return res.status(502).json({ error: "blob upload failed", detail: t });
    }
    const { url: blobUrl } = await up2.json();

    return res.status(200).json({ ok: true, key, url: blobUrl });
  } catch (e) {
    console.error("Submit error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
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
