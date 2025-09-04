// lib/blob.js
// Utilities for reading submissions stored in Vercel Blob.
// Requires env: BLOB_READ_WRITE_TOKEN

import { list } from '@vercel/blob';

// Adjust if your submissions live under a different prefix
const SUBMISSIONS_PREFIX = 'submissions/';

// Helper: fetch JSON from a Blob URL using the RW token
async function fetchJSON(url) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
  });
  if (!r.ok) {
    throw new Error(`blob_fetch_failed_${r.status}`);
  }
  return r.json();
}

// List all submission JSON objects.
// Expects files saved like `submissions/<id>.json`
export async function listSubmissions() {
  const { blobs } = await list({ prefix: SUBMISSIONS_PREFIX });

  const items = [];
  for (const b of blobs) {
    // Only load JSON records
    if (!b.pathname.endsWith('.json')) continue;
    const json = await fetchJSON(b.url);
    items.push(json);
  }

  // Sort newest first by created_at/createdAt if present
  items.sort(
    (a, b) =>
      new Date(b.created_at || b.createdAt || 0) -
      new Date(a.created_at || a.createdAt || 0)
  );

  return items;
}

// Fetch a single submission by its ID (file: submissions/<id>.json)
export async function getSubmissionById(id) {
  // We list to find the exact blob key; avoids guessing extension/case
  const { blobs } = await list({ prefix: SUBMISSIONS_PREFIX });
  const key = `${SUBMISSIONS_PREFIX}${id}.json`;
  const hit = blobs.find((b) => b.pathname === key);
  if (!hit) throw new Error('not_found');
  return await fetchJSON(hit.url);
}
