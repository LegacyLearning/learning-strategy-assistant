// lib/export/docx.js
// Builds a .docx report from a submission JSON.
// Requires `docx` in package.json.

import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

export async function generateDocxBuffer(data) {
  const doc = new Document({
    sections: [{ children: build(data) }]
  });
  return await Packer.toBuffer(doc);
}

const H  = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1 });
const H2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2 });
const P  = (t) => new Paragraph({ children: [new TextRun(t || '')] });

function build(d) {
  const out = [];

  // Header
  out.push(H(d.organization || 'Strategy Draft'));
  if (d.contact_name || d.contact_email) {
    out.push(
      P(
        `Contact: ${d.contact_name || ''}${
          d.contact_email ? ' · ' + d.contact_email : ''
        }`
      )
    );
  }
  if (d.summary) out.push(P(d.summary));

  // Outcomes
  if (Array.isArray(d.outcomes) && d.outcomes.length) {
    out.push(H('Outcomes'));
    d.outcomes.forEach((o, i) => {
      out.push(H2(`${i + 1}. ${o.title || 'Outcome'}`));
      if (o.description) out.push(P(o.description));
      (o.behaviors || []).forEach((b) => out.push(P('• ' + b)));
    });
  }

  // Modules
  if (Array.isArray(d.modules) && d.modules.length) {
    out.push(H('Modules'));
    d.modules.forEach((m, i) => {
      out.push(H2(`${i + 1}. ${m.title || 'Module'}`));
      if (m.objective) out.push(P('Objective: ' + m.objective));
      (m.activities || []).forEach((a) => out.push(P('– ' + a)));
    });
  }

  // Notes
  if (d.notes) {
    out.push(H('Notes'));
    out.push(P(String(d.notes)));
  }

  return out;
}
