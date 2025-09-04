// api/admin/submissions.js
export default async function handler(req, res) {
  // Require admin token
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Parse query params
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = Math.min(parseInt(req.query.pageSize || '20', 10), 100);
  const q = (req.query.q || '').toLowerCase();
  const status = req.query.status || '';

  // Pull all submissions (we'll add this helper in the next step)
  const { listSubmissions } = await import('../../lib/blob.js');
  const all = await listSubmissions();

  // Filter by search + status
  const filtered = all.filter((x) => {
    const hitQ = !q || JSON.stringify(x).toLowerCase().includes(q);
    const hitS = !status || x.status === status;
    return hitQ && hitS;
  });

  // Paginate
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  // Respond
  res.json({ total: filtered.length, items });
}
