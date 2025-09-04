import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
  Header,
  Footer,
} from "docx";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await readJson(req);

    const client   = (body.client   || "").toString().trim();
    const scope    = (body.scope    || "").toString().trim(); // optional; shown only if present
    const overview = (body.overview || "").toString().trim();
    const approach = (body.approach || "").toString().trim();
    const outcomes = Array.isArray(body.outcomes) ? body.outcomes.map(String) : [];
    const format   = (body.format   || "").toString().trim();
    const modules  = Array.isArray(body.modules)  ? body.modules.map(String)  : [];

    const today = new Date().toISOString().split("T")[0];

    // ---------- Branding (header/footer) ----------
    const header = new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Legacy Learning Consulting", bold: true }),
            new TextRun({ text: " — Learning Strategy" }),
          ],
        }),
      ],
    });

    const footer = new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `© ${new Date().getFullYear()} Legacy Learning Consulting • legacylearningconsulting.com`,
            }),
          ],
        }),
      ],
    });

    // ---------- Helpers ----------
    const paras = [];
    const blank = () => new Paragraph(""); // single blank line under a header

    const addSection = (title, lines) => {
      paras.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }));
      if (Array.isArray(lines) && lines.length) {
        paras.push(...lines);
      } else {
        paras.push(blank()); // leave empty if nothing provided
      }
    };

    // ---------- Title + Date ----------
    paras.push(new Paragraph({ text: "Learning Strategy", heading: HeadingLevel.HEADING_1 }));
    paras.push(new Paragraph(`Date: ${today}`));

    // ---------- REQUIRED SECTIONS (always shown) ----------

    // 1) Client Name (with optional Scope line if provided)
    {
      const lines = [];
      if (client) lines.push(new Paragraph(client));
      else lines.push(blank());
      if (scope) lines.push(new Paragraph(`Scope: ${scope}`)); // include only when provided
      addSection("Client Name", lines);
    }

    // 2) Overview
    {
      const lines = overview ? overview.split("\n").map((p) => new Paragraph(p)) : [blank()];
      addSection("Overview", lines);
    }

    // 3) Our Learning Approach & Philosophies
    {
      const lines = approach ? approach.split("\n").map((p) => new Paragraph(p)) : [blank()];
      addSection("Our Learning Approach & Philosophies", lines);
    }

    // 4) Recommended Format
    {
      const lines = format ? format.split("\n").map((p) => new Paragraph(p)) : [blank()];
      addSection("Recommended Format", lines);
    }

    // 5) Program Outcomes
    {
      paras.push(new Paragraph({ text: "Program Outcomes", heading: HeadingLevel.HEADING_2 }));
      // Keep the standard lead-in sentence (matches your sample doc)
      paras.push(new Paragraph("At the end of this learning program, learners will be able to:"));
      const clean = outcomes.map((o) => String(o || "").trim()).filter(Boolean);
      if (clean.length) {
        clean.forEach((t) => paras.push(new Paragraph({ text: t, bullet: { level: 0 } })));
      } else {
        paras.push(blank());
      }
    }

    // 6) Program Modules
    {
      paras.push(new Paragraph({ text: "Program Modules", heading: HeadingLevel.HEADING_2 }));
      const clean = modules.map((m) => String(m || "").trim()).filter(Boolean);
      if (clean.length) {
        clean.forEach((t, i) => paras.push(new Paragraph(`${i + 1}. ${t}`)));
      } else {
        paras.push(blank());
      }
    }

    // ---------- Build document ----------
    const doc = new Document({
      sections: [
        {
          headers: { default: header },
          footers: { default: footer },
          properties: {},
          children: paras,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const safeBase =
      (client || "strategy")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "strategy";

    const filename = `${safeBase}-learning-strategy.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("Export error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
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
