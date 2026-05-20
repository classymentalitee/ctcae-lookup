require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a few minutes and try again." }
});
app.use("/api/", limiter);

app.use(express.static(path.join(__dirname, "../frontend/public")));

app.post("/api/lookup", async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ error: "Please provide a clinical description." });
  }
  if (query.trim().length > 1000) {
    return res.status(400).json({ error: "Description too long. Please keep it under 1000 characters." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server configuration error. Please contact the administrator." });
  }

  const systemPrompt = `You are a clinical research expert specializing in NCI CTCAE v5.0 (Common Terminology Criteria for Adverse Events, version 5.0). Your role is to map clinical descriptions, lab findings, and patient symptoms to the correct CTCAE v5.0 adverse event terms.

Return ONLY raw JSON (no markdown, no backticks, no preamble) with this exact structure:
{
  "terms": [
    {
      "term": "CTCAE term name exactly as in v5.0",
      "soc": "System Organ Class full name",
      "definition": "The CTCAE v5.0 definition of this adverse event",
      "relevance": 95,
      "grades": {
        "1": "Grade 1 description from CTCAE v5.0",
        "2": "Grade 2 description from CTCAE v5.0",
        "3": "Grade 3 description from CTCAE v5.0",
        "4": "Grade 4 description from CTCAE v5.0",
        "5": "Grade 5 description or omit key if not applicable for this term"
      },
      "note": "Optional: one sentence grading tip or clinical disambiguation note. Omit this key if not needed."
    }
  ],
  "summary": "One sentence explaining the overall mapping rationale"
}

Rules:
- Return 1-4 of the most relevant CTCAE v5.0 terms, sorted by relevance (highest first)
- relevance is an integer 0-100
- Use the EXACT term name as it appears in CTCAE v5.0
- Include all applicable grade descriptions verbatim from CTCAE v5.0
- If a lab value is provided, note the likely grade in the note field if determinable
- If the description is ambiguous, return your best matches and explain briefly in note
- Never invent or approximate terms not present in CTCAE v5.0
- Do not include any text outside the JSON object`;

  try {
    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: `Clinical description: ${query.trim()}` }]
      })
    });

    if (!anthropicResp.ok) {
      const errBody = await anthropicResp.json().catch(() => ({}));
      return res.status(502).json({ error: "AI service error. Please try again shortly." });
    }

    const anthropicData = await anthropicResp.json();
    const rawText = (anthropicData.content || []).map(b => b.text || "").join("").trim();

    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/^```json|```$/g, "").trim());
    } catch {
      return res.status(500).json({ error: "Could not parse AI response. Please try again." });
    }

    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Server error. Please try again." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/public/index.html"));
});

app.listen(PORT, () => {
  console.log(`CTCAE Lookup server running on port ${PORT}`);
});
