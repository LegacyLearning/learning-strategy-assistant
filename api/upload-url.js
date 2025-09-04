// api/upload-url.js
// Issues short-lived client upload tokens for Vercel Blob uploads.
// Browser calls this route indirectly via @vercel/blob/client `upload(..., { handleUploadUrl: "/api/upload-url" })`
//
// Docs: Vercel "Client Uploads with Vercel Blob" (uses `handleUpload`) 
// https://vercel.com/docs/vercel-blob/client-upload

import { handleUpload } from '@vercel/blob/client';

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } }, // JSON body with metadata only (not file bytes)
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // `req.body` should be the JSON that @vercel/blob/client sends (HandleUploadBody)
    const body = req.body || {};

    // Create a Fetch API Request object because handleUpload expects one
    const origin =
      (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host;
    const request = new Request(origin + req.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    const jsonResponse = await handleUpload({
      body,
      request,
      // 🔒 Add your own auth check here if you need to restrict who can upload
      // e.g., read a session cookie/header and reject if not authorized.

      // Configure what uploads you allow
      onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
        return {
          // allow common docs/images; tweak to your needs
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          addRandomSuffix: true, // avoids collisions
          // tokenPayload is optional metadata echoed back on completion webhook
          tokenPayload: JSON.stringify({}), 
        };
      },

      // Optional: called by Vercel when the browser has finished uploading
      onUploadCompleted: async ({ blob /*, tokenPayload */ }) => {
        // Example: log or persist blob.url if you want a server-side record
        console.log('Blob upload completed:', blob.url);
      },
    });

    res.status(200).json(jsonResponse);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: String(error?.message || error) });
  }
}
