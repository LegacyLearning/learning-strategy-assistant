export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await readJson(req);
    const client = String(body.client || "");
    const scope = String(body.scope || "");
    const text = String(body.text || "");
    const max_outcomes = Number(body.max_outcomes || 8);
    const target_modules = Number(body.target_modules || 6);

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY missing" });
    }
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: "Provide at least ~50 characters of text." });
    }

    const sys =
      "You are an instructional design assistant for Legacy Learning Consulting. " +
      "Write behavioral, observable program outcomes using strong action verbs. " +
      "Do NOT start outcomes with 'By the end' or 'Learners will be able to'. " +
      "Assume the UI shows the header: 'At the end of this learning program, learners will be able to:'. " +
      "Then propose high-level module titles seeded from the outcomes/topics; avoid duplicates and fluff.";

    let user = "";
    user += "Client: " + (client || "TBD") + "\n";
    user += "Scope: " + (scope || "TBD") + "\n\n";
    user += `From the following materials, produce up to ${max_outcomes} outcomes and ${target_modules} module titles.\n\n`;
    user += "TEXT:\n" + text.slice(0, 180000);

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "legacy_outline",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                outcomes: { type: "array", items: { type: "string" } },
                modules:  { type: "array", items: { type: "string" } },
                notes:    { type: "string" }
              },
              required: ["outcomes", "modules", "notes"]
            }
          }
        }
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(502).json({ error: "OpenAI error", detail: err });
    }
    const data = await resp.json();

    // Extract JSON block
    let block = "";
    if (typeof data.output_text === "_

