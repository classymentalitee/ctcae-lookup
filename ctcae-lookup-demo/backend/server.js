require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend/public")));

// ── Demo data — realistic CTCAE v5.0 responses ───────────────
const DEMO_RESPONSES = {
  default: {
    summary: "DEMO MODE — these are example responses to show how the tool works.",
    terms: [
      {
        term: "Anorexia",
        soc: "Metabolism and nutrition disorders",
        definition: "A disorder characterized by a loss of appetite.",
        relevance: 92,
        grades: {
          "1": "Loss of appetite without alteration in eating habits",
          "2": "Oral intake altered without significant weight loss; oral nutritional supplements indicated",
          "3": "Associated with significant weight loss or malnutrition; IV fluids, tube feeding, or TPN indicated",
          "4": "Life-threatening consequences; urgent intervention indicated",
          "5": "Death"
        },
        note: "Consider also 'Nausea' if patient reports feeling sick, or 'Dehydration' if fluid intake is also reduced."
      },
      {
        term: "Nausea",
        soc: "Gastrointestinal disorders",
        definition: "A disorder characterized by a queasy sensation and/or the urge to vomit.",
        relevance: 78,
        grades: {
          "1": "Loss of appetite without alteration in eating habits",
          "2": "Oral intake decreased without significant weight loss, dehydration or malnutrition",
          "3": "Inadequate oral caloric or fluid intake; tube feeding, TPN, or hospitalization indicated"
        }
      }
    ]
  },
  pancreatic: {
    summary: "Lab finding maps directly to a CTCAE decreased-enzyme term.",
    terms: [
      {
        term: "Pancreatic enzymes decreased",
        soc: "Investigations",
        definition: "A finding based on laboratory test results that indicate a decrease in levels of pancreatic enzymes in a biological specimen.",
        relevance: 98,
        grades: {
          "1": "Asymptomatic; clinical or diagnostic observations only; intervention not indicated",
          "2": "Symptomatic; medical intervention indicated",
          "3": "Severe symptoms; hospitalization indicated",
          "4": "Life-threatening consequences; urgent intervention indicated",
          "5": "Death"
        },
        note: "Grade is typically determined by degree of deviation from institutional normal limits and clinical symptoms."
      }
    ]
  },
  wbc: {
    summary: "Low WBC maps to the CTCAE neutrophil/leukocyte count decreased terms.",
    terms: [
      {
        term: "White blood cell decreased",
        soc: "Investigations",
        definition: "A finding based on laboratory test results that indicate a decrease in number of white blood cells in a blood specimen.",
        relevance: 95,
        grades: {
          "1": "<LLN - 3000/mm3; <LLN - 3.0 x 10e9/L",
          "2": "<3000 - 2000/mm3; <3.0 - 2.0 x 10e9/L",
          "3": "<2000 - 1000/mm3; <2.0 - 1.0 x 10e9/L",
          "4": "<1000/mm3; <1.0 x 10e9/L",
          "5": "Death"
        },
        note: "A value of 1.8 x 10e9/L falls in Grade 2 range. Also consider grading Neutrophil count decreased separately if ANC is available."
      },
      {
        term: "Neutrophil count decreased",
        soc: "Investigations",
        definition: "A finding based on laboratory test results that indicate a decrease in number of neutrophils in a blood specimen.",
        relevance: 80,
        grades: {
          "1": "<LLN - 1500/mm3; <LLN - 1.5 x 10e9/L",
          "2": "<1500 - 1000/mm3; <1.5 - 1.0 x 10e9/L",
          "3": "<1000 - 500/mm3; <1.0 - 0.5 x 10e9/L",
          "4": "<500/mm3; <0.5 x 10e9/L",
          "5": "Death"
        }
      }
    ]
  },
  creatinine: {
    summary: "Elevated creatinine above baseline maps to Creatinine increased; value suggests Grade 2–3.",
    terms: [
      {
        term: "Creatinine increased",
        soc: "Investigations",
        definition: "A finding based on laboratory test results that indicate increased levels of creatinine in a biological specimen.",
        relevance: 97,
        grades: {
          "1": ">1 - 1.5x baseline; >ULN - 1.5x ULN",
          "2": ">1.5 - 3x baseline; >1.5 - 3x ULN",
          "3": ">3x baseline or >3 - 6x ULN",
          "4": ">6x ULN",
          "5": "Death"
        },
        note: "Creatinine 2.4 vs baseline 0.9 is a 2.67x increase — consistent with Grade 2. Confirm against ULN for your institution."
      },
      {
        term: "Acute kidney injury",
        soc: "Renal and urinary disorders",
        definition: "A disorder characterized by the acute loss of renal function and is traditionally characterized by the accumulation of end products of nitrogen metabolism.",
        relevance: 72,
        grades: {
          "1": "Creatinine level increase of >0.3 mg/dL; creatinine 1.5-2.0x above baseline",
          "2": "Creatinine 2-3x above baseline",
          "3": "Creatinine >3x baseline or >4.0 mg/dL; hospitalization indicated",
          "4": "Life-threatening consequences; dialysis indicated",
          "5": "Death"
        }
      }
    ]
  },
  mucositis: {
    summary: "Severe mouth sores with inability to swallow maps to Mucositis oral, likely Grade 3.",
    terms: [
      {
        term: "Mucositis oral",
        soc: "Gastrointestinal disorders",
        definition: "A disorder characterized by inflammation of the oral mucosal membrane.",
        relevance: 96,
        grades: {
          "1": "Asymptomatic or mild symptoms; intervention not indicated",
          "2": "Moderate pain; not interfering with oral intake; modified diet indicated",
          "3": "Severe pain; interfering with oral intake",
          "4": "Life-threatening consequences; urgent intervention indicated",
          "5": "Death"
        },
        note: "Inability to swallow indicates Grade 3 at minimum. Document as Mucositis oral rather than 'stomatitis' per CTCAE v5.0 preference."
      },
      {
        term: "Dysphagia",
        soc: "Gastrointestinal disorders",
        definition: "A disorder characterized by difficulty in swallowing.",
        relevance: 75,
        grades: {
          "1": "Symptomatic, able to eat regular diet",
          "2": "Symptomatic and altered eating/swallowing; oral supplements indicated",
          "3": "Severely altered eating/swallowing; tube feeding or TPN or hospitalization indicated",
          "4": "Life-threatening consequences; urgent intervention indicated",
          "5": "Death"
        }
      }
    ]
  },
  neuropathy: {
    summary: "Tingling and numbness in feet maps to Peripheral sensory neuropathy.",
    terms: [
      {
        term: "Peripheral sensory neuropathy",
        soc: "Nervous system disorders",
        definition: "A disorder characterized by functional disturbances of peripheral sensory nerves.",
        relevance: 97,
        grades: {
          "1": "Asymptomatic; loss of deep tendon reflexes or paresthesia",
          "2": "Moderate symptoms; limiting instrumental ADL",
          "3": "Severe symptoms; limiting self care ADL",
          "4": "Life-threatening consequences; urgent intervention indicated",
          "5": "Death"
        },
        note: "Distinguish from Peripheral motor neuropathy if weakness is also present. Document distribution (bilateral feet = stocking pattern)."
      }
    ]
  },
  alopecia: {
    summary: "Hair loss maps directly to Alopecia in CTCAE v5.0.",
    terms: [
      {
        term: "Alopecia",
        soc: "Skin and subcutaneous tissue disorders",
        definition: "A disorder characterized by a decrease in density of hair compared to normal for a given individual at a given age and body location.",
        relevance: 99,
        grades: {
          "1": "Hair loss of <50% of normal for that individual that is not obvious from a distance but only on close inspection; a different hair style may be required to cover the hair loss but it does not require a wig or hair piece to camouflage",
          "2": "Hair loss of >=50% normal for that individual that is readily apparent to others; a wig or hair piece is necessary if the patient desires to completely camouflage the hair loss; associated with psychosocial impact"
        },
        note: "Alopecia in CTCAE v5.0 only has Grade 1 and Grade 2 — there is no Grade 3, 4, or 5 for this term."
      }
    ]
  }
};

function getDemoResponse(query) {
  const q = query.toLowerCase();
  if (q.includes("pancreatic") || q.includes("enzyme")) return DEMO_RESPONSES.pancreatic;
  if (q.includes("wbc") || q.includes("white blood") || q.includes("1.8")) return DEMO_RESPONSES.wbc;
  if (q.includes("creatinine")) return DEMO_RESPONSES.creatinine;
  if (q.includes("mouth") || q.includes("swallow") || q.includes("mucositis") || q.includes("sore")) return DEMO_RESPONSES.mucositis;
  if (q.includes("numb") || q.includes("tingle") || q.includes("tingling") || q.includes("neuropathy") || q.includes("feet") || q.includes("foot")) return DEMO_RESPONSES.neuropathy;
  if (q.includes("hair")) return DEMO_RESPONSES.alopecia;
  return DEMO_RESPONSES.default;
}

// ── Demo lookup endpoint ───────────────────────────────────────
app.post("/api/lookup", (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ error: "Please provide a clinical description." });
  }
  // Simulate a short delay so it feels realistic
  setTimeout(() => {
    res.json(getDemoResponse(query.trim()));
  }, 800);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/public/index.html"));
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   CTCAE Lookup — DEMO MODE               ║
  ║   No API key needed                      ║
  ║   Open: http://localhost:${PORT}           ║
  ╚══════════════════════════════════════════╝
  `);
});
