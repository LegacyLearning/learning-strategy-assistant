// api/admin/submission.js
export default async function handler(req, res) {
  // Require admin token
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Read ?id=<submissionId>
  const id = (req.query.id || '').trim();
  if (!id) {
    return res.status(400).json({ error: 'missing_id' });
  }

  try {
    const { getSubmissionById } = await import('../../lib/blob.js');
    const data = await getSubmissionById(id);
    return res.status(200).json(data);
  } catch (e) {
    if (String(e.message || '').includes('not_found')) {
      return res.status(404).json({ error: 'not_found' });
    }
    console.error(e);
    return res.status(500).json({ error: 'read_failed' });
  }
}
