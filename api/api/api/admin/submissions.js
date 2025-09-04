export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const auth = req.headers.authorization || "";
    if (!process.env.ADMIN_TOKEN) return res.status(500).json({ error: "ADMIN_TOKEN missing" });
    if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) return res.status(401).json({ error: "Unauthorized" });

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({ error: "BLOB_READ_WRITE_TOKEN missing" });
    }

    const r = await fetch("https://api.vercel.com/v2/blob/list?prefix=submissions/", {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: "blob list failed", detail: t });
    }
    const data = await r.json();
    // Return minimal listing (key, size, uploadedAt)
    const items = (data.blobs || []).map(b => ({ key: b.key, size: b.size, uploadedAt: b.uploadedAt }));
    return res.status(200).json({ items });
  } catch (e) {
    console.error("admin list error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
