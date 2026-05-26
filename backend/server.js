require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

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

const CTCAE_TERMS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "ctcae_terms.json"), "utf8")
);

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

const STOPWORDS = new Set(['the','and','or','for','with','that','this',
  'are','was','were','has','have','had','been','being','not','but','from',
  'they','their','them','which','when','where','disorder','characterized',
  'finding','condition','based','laboratory','test','results','indicate']);

function getKeywords(text) {
  return tokenize(text).filter(w => !STOPWORDS.has(w));
}

const termIndex = CTCAE_TERMS.map(term => {
  const searchText = [
    term.term, term.term, term.term,
    term.soc,
    term.definition,
    Object.values(term.grades || {}).join(' ')
  ].join(' ');
  return { ...term, keywords: getKeywords(searchText) };
});

function searchTerms(query, topN = 8) {
  const queryKeywords = getKeywords(query);
  const queryLower = query.toLowerCase();

  const scores = termIndex.map(term => {
    let score = 0;
    if (term.term.toLowerCase() === queryLower) score += 100;
    const termLower = term.term.toLowerCase();
    if (termLower.includes(queryLower)) score += 50;
    if (queryLower.includes(termLower)) score += 40;
    for (const qkw of queryKeywords) {
      for (const tkw of term.keywords) {
        if (tkw === qkw) score += 5;
        else if (tkw.startsWith(qkw) || qkw.startsWith(tkw)) score += 2;
      }
    }
    const socLower = term.soc.toLowerCase();
    for (const qkw of queryKeywords) {
      if (socLower.includes(qkw)) score += 3;
    }
    const defLower = term.definition.toLowerCase();
    for (const qkw of queryKeywords) {
      if (defLower.includes(qkw)) score += 1;
    }
    return { term, score };
  });

  return scores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(s => s.term);
}

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
    return res.status(500).json({ error: "Server configuration error." });
  }

  const candidates = searchTerms(query.trim());

  if (candidates.length === 0) {
    return res.json({
      terms: [],
      summary: "No matching CTCAE v5.0 terms found. Try rephrasing your description."
    });
  }

  const context = candidates.map(t => {
    const gradeLines = Object.entries(t.grades || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([g, desc]) => `  Grade ${g}: ${desc}`)
      .join('\n');
    return `TERM: ${t.term}
SOC: ${t.soc}
DEFINITION: ${t.definition}
GRADES:
${gradeLines || '  (See CTCAE v5.0 document for grade definitions)'}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `You are a clinical research expert. You will receive a clinical description and a set of CTCAE v5.0 terms retrieved from the official NCI CTCAE v5.0 database.

Your job is to:
1. Select the most relevant term(s) from the PROVIDED LIST ONLY - do not add any terms not in the list
2. Return them in order of relevance to the clinical description
3. Use the EXACT grade descriptions provided - do not modify or invent grade text
4. Return 1-4 terms maximum

IMPORTANT: You may ONLY use terms from the provided candidate list. If none are relevant, return an empty terms array.

Return ONLY raw JSON (no markdown, no backticks):
{
  "terms": [
    {
      "term": "exact term name from the list",
      "soc": "exact SOC from the list",
      "definition": "exact definition from the list",
      "relevance": 95,
      "grades": {
        "1": "exact grade 1 text from the list",
        "2": "exact grade 2 text from the list",
        "3": "exact grade 3 text from the list",
        "4": "exact grade 4 text from the list",
        "5": "exact grade 5 text or omit if not in list"
      },
      "note": "optional one-sentence clinical disambiguation note"
    }
  ],
  "summary": "one sentence explaining the mapping"
}`;

  const userMessage = `Clinical description: ${query.trim()}

CTCAE v5.0 CANDIDATE TERMS (select from these only):

${context}`;

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    if (!anthropicResp.ok) {
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

    if (parsed.terms) {
      parsed.terms.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
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
  console.log(`CTCAE RAG Lookup server running on port ${PORT}`);
});
