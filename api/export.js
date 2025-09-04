// api/export.js
// Supports two modes:
// 1) GET /api/export?id=<submissionId>  (admin-only) -> returns .docx
// 2) POST /api/export  (client posts the submission JSON) -> returns .docx

import { getSubmissionById } from '../lib/blob.js';
import { generateDocxBuffer } from '../lib/export/docx.js';

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

export default async function handler(req, res) {
  try {
    let data;

    if (req.method === 'GET' && req.query.id) {
      // Admin GET by id
      if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      data = await getSubmissionById(String(req.query.id));
    } else if (req.method === 'POST') {
      // Existing client flow
      data = req.body;
    } else {
      return res.status(400).json({ error: 'unsupported' });
    }

    // Build .docx buffer
    const buf = await generateDocxBuffer(data);

    // Nice filename based on organization
    const filename =
      (data.organization?.replace(/[^a-z0-9-_]+/gi, '_') || 'strategy_draft') +
      '.docx';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(Buffer.from(buf));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'export_failed' });
  }
}
