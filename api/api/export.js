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
    const scope    = (body.scope    || "").toString().trim();
    const overview = (body.overview || "").toString().trim();
    const approach = (body.approach || "").toString().trim();
    const outcomes = Array.isArray(body.outcomes) ? body.outcomes.map(String) : [];
    const format   = (body.format   || "").toString().trim();
    const modules  = Array.isArray(body.modules)  ? body.modules.map(String)  : [];

    const today = new Date().toISOString().split("T")[0];

    // Helpers
    const notProvided = (s) => (s && s.trim().length ? s : "(Not provided)");
    const addSection = (title, children) => {
      paras.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }));
      if (children && children.length) {
        paras.push(...children);
      } else {
        paras.push(new Paragraph("(Not provided)"));
      }
    };

    // Branding header & footer (text-only; no extra assets needed)
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

    // Body
    const paras = [];

    // Title + date
    paras.push(
      new Paragraph({ text: "Learning Strategy", heading: HeadingLevel.HEADING_1 })
    );
    paras.push(new Paragraph(`Date: ${today}`));

    // --- REQUIRED SIX SECTIONS, ALWAYS IN THIS ORDER ---

    // 1) Client Name (and include Scope under it if present)
    addSection("Client Name", [
      new Paragraph(notProvided(client)),
      new Paragraph({}) ,
      new Paragraph(scope ? `Scope: ${scope}` : "Scope: (Not provided)"),
    ]);

    // 2) Overview
    addSection(
      "Overview",
      overview
        ? overview.split("\n").map((p) => new Paragraph(p))
        : null
    );

    // 3) Our Learning Approach & Philosophies
    addSection(
      "Our Learning Approach & Philosophies",
      approach
        ? approach.split("\n").map((p) => new Paragraph(p))
        : null
    );

    // 4) Recommended Format
    addSection(
      "Recommended Format",
      format
        ? format.split("\n").map((p) => new Paragraph(p))
        : null
    );

    // 5) Program Outcomes
    {
      const hasOutcomes = outcomes && outcomes.filter((o) => String(o).trim()).length > 0;
      paras.push(new Paragraph({ text: "Program Outcomes", heading: HeadingLevel.HEADING_2 }));
      paras.push(
        new Paragraph("At the end of this learning program, learners will be able to:")
      );
      if (hasOutcomes) {
        outcomes.forEach((o) => {
          const t = String(o || "").trim();
          if (t) paras.push(new Paragraph({ text: t, bullet: { level: 0 } }));
        });
      } else {
        paras.push(new Paragraph("(Not provided)"));
      }
    }

    // 6) Program Modules (simple numbered outline; keep as plain paragraphs if provided)
    {
      paras.push(new Paragraph({ text: "Program Modules", heading: HeadingLevel.HEADING_2 }));
      const hasModules = modules && modules.filter((m) => String(m).trim()).length > 0;
      if (hasModules) {
        modules.forEach((m, i) => {
          const t = String(m || "").trim();
          if (t) paras.push(new Paragraph(`${i + 1}. ${t}`));
        });
      } else {
        paras.push(new Paragraph("(Not provided)"));
      }
    }

    // Build doc
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
