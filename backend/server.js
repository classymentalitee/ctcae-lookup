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
  validate: { xForwardedForHeader: false },
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

  const systemPrompt = `You are a clinical data manager with expert knowledge of the NCI CTCAE v5.0 term list. Your job is to map clinical descriptions to VERIFIED CTCAE v5.0 terms ONLY.

CRITICAL RULES:
- ONLY return terms that appear VERBATIM in the official NCI CTCAE v5.0 term list
- NEVER invent, approximate, or generalize terms
- NEVER return a disease name as a CTCAE term (e.g. "Diabetes mellitus" is NOT a CTCAE term — use "Blood glucose increased")
- NEVER return organ system names as terms (e.g. "Nail disorder" is NOT a CTCAE term — use specific terms or "[SOC] - Other, specify")
- If no specific CTCAE v5.0 term exists, use the correct "[System Organ Class] - Other, specify" format
- Grade descriptions must be verbatim from CTCAE v5.0
- For lab values, determine grade precisely using exact CTCAE v5.0 numeric boundaries. If a value sits at a boundary, note the ambiguity rather than suggesting multiple grades.

Return ONLY raw JSON (no markdown, no backticks, no preamble):
{
  "terms": [
    {
      "term": "Exact CTCAE v5.0 term name",
      "soc": "System Organ Class full name",
      "definition": "CTCAE v5.0 definition verbatim",
      "relevance": 95,
      "grades": {
        "1": "Grade 1 description verbatim from CTCAE v5.0",
        "2": "Grade 2 description verbatim from CTCAE v5.0",
        "3": "Grade 3 description verbatim from CTCAE v5.0",
        "4": "Grade 4 description verbatim from CTCAE v5.0",
        "5": "Grade 5 or omit if not applicable"
      },
      "note": "Optional: one sentence clinical note. Omit if not needed."
    }
  ],
  "summary": "One sentence explaining the mapping"
}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1200,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: `Clinical description: ${query.trim()}` }]
      })
    });

    if (!anthropicResp.ok) {
      res.write(`data: ${JSON.stringify({ error: "AI service error. Please try again shortly." })}\n\n`);
      res.end();
      return;
    }

    let fullText = '';
    const reader = anthropicResp.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text;
              res.write(`data: ${JSON.stringify({ type: 'progress' })}\n\n`);
            }
          } catch {}
        }
      }
    }

    try {
      const clean = fullText.replace(/^```json|```$/g, '').trim();
      const result = JSON.parse(clean);
      result.terms.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
      res.write(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ error: "Could not parse AI response. Please try again." })}\n\n`);
    }

    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "Server error. Please try again." })}\n\n`);
    res.end();
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/public/index.html"));
});

app.listen(PORT, () => {
  console.log(`CTCAE Lookup server running on port ${PORT}`);
});
