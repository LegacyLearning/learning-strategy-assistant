import { Document, Packer, Paragraph, HeadingLevel } from "docx";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await readJson(req);
    const client = (body.client || "Client").toString().trim();
    const scope  = (body.scope  || "Scope").toString().trim();
    const overview = (body.overview || "").toString();
    const approach = (body.approach || "").toString();
    const outcomes = Array.isArray(body.outcomes) ? body.outcomes : [];
    const format   = (body.format || "").toString();
    const modules  = Array.isArray(body.modules) ? body.modules : [];
    const today = new Date().toISOString().split("T")[0];

    const paras = [];
    paras.push(new Paragraph({ text: "Learning Strategy", heading: HeadingLevel.HEADING_1 }));
    paras.push(new Paragraph(`${client} — ${scope}`));
    paras.push(new Paragraph(`Date: ${today}`));

    if (overview) {
      paras.push(new Paragraph({ text: "Overview", heading: HeadingLevel.HEADING_2 }));
      overview.split("\n").forEach(p => paras.push(new Paragraph(p)));
    }

    if (approach) {
      paras.push(new Paragraph({ text: "Our Learning Approach & Philosophies", heading: HeadingLevel.HEADING_2 }));
      approach.split("\n").forEach(p => paras.push(new Paragraph(p)));
    }

    paras.push(new Paragraph({ text: "Program Outcomes", heading: HeadingLevel.HEADING_2 }));
    paras.push(new Paragraph("At the end of this learning program, learners will be able to:"));
    outcomes.forEach(o => paras.push(new Paragraph({ text: String(o), bullet: { level: 0 } })));

    if (format) {
      paras.push(new Paragraph({ text: "Recommended Format", heading: HeadingLevel.HEADING_2 }));
      format.split("\n").forEach(p => paras.push(new Paragraph(p)));
    }

    if (modules.length) {
      paras.push(new Paragraph({ text: "Program Modules", heading: HeadingLevel.HEADING_2 }));
      modules.forEach((m, i) => paras.push(new Paragraph(`${i + 1}. ${m}`)));
    }

    const doc = new Document({ sections: [{ properties: {}, children: paras }] });
    const buffer = await Packer.toBuffer(doc);

    const safeBase = (client || "strategy")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "strategy";

    const filename = `${safeBase}-learning-strategy.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message || "Export failed" });
  }
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
