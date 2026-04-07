from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import json
import tempfile
import os
import re

# ─── CONFIG ───────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
# New google-generativeai 0.8.x client API
client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI(title="FairAI Resume Analysis API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── PROMPT ───────────────────────────────────────────────────
ANALYSIS_PROMPT = """
You are FairAI, an expert unbiased technical hiring evaluator analyzing a resume for a {role} position.

## MANDATORY BIAS PREVENTION RULES:
1. IGNORE COMPLETELY: candidate name, pronouns, gender, age, graduation year, employment gaps, institution prestige or gender associations, location, marital status
2. EVALUATE ONLY: technical skills demonstrated through projects, specific measurable impact/results, technology stack depth, problem-solving complexity, scope and scale of work done
3. NEVER penalize employment gaps - they are legally protected and statistically biased against women and minorities
4. Judge based on what they built and delivered, not where they studied

## YOUR ANALYSIS TASKS:
1. Score the candidate's TRUE technical fit for: {role}
2. Identify every "bias proxy" - phrases/elements a legacy ATS or biased hiring manager would unfairly use
3. Estimate what score a biased legacy ATS would give (typically trained on historically male, no-gap, ivy-league data)
4. Break down true competency across 6 dimensions
5. List the candidate's strongest signals and any genuine skill gaps for {role}

## RESPOND WITH ONLY RAW JSON. NO MARKDOWN, NO BACKTICKS, NO EXPLANATION - JUST THE JSON:

{
  "fit_score": <integer 0-100 based PURELY on technical merit>,
  "fit_level": "<one of exactly: Strong Match, Good Match, Partial Match, Not a Match>",
  "summary": "<2-3 sentences. Be specific - cite actual projects or skills from this resume. Explain WHY they are or are not a fit for the role>",
  "radar": {
    "technical_depth": <integer 0-100>,
    "problem_solving": <integer 0-100>,
    "impact_evidence": <integer 0-100>,
    "domain_knowledge": <integer 0-100>,
    "project_complexity": <integer 0-100>,
    "communication_clarity": <integer 0-100>
  },
  "strong_signals": [
    {
      "signal": "<specific skill, project, or achievement>",
      "evidence": "<direct quote or close paraphrase from the resume>",
      "weight": "<high or medium>"
    }
  ],
  "gaps": [
    {
      "gap": "<a specific skill genuinely missing for this role>",
      "severity": "<blocking or minor>"
    }
  ],
  "bias_proxies": [
    {
      "text": "<exact phrase or word from the resume that reveals demographic info>",
      "bias_type": "<one of: gender, age, name, institution, gap, location, socioeconomic>",
      "severity": "<high, medium, or low>",
      "explanation": "<how a biased ATS would use this against the candidate>"
    }
  ],
  "counterfactual": {
    "legacy_ats_score": <integer 0-100, what a biased legacy ATS would score>,
    "fairai_score": <same as fit_score>,
    "score_delta": <fairai_score minus legacy_ats_score>,
    "primary_bias_factor": "<the #1 reason a biased system would have downgraded this candidate>"
  },
  "legacy_ats_verdict": "<one of exactly: Auto-Rejected, Flagged for Review, Passed>",
  "recommendation": "<one of exactly: Advance to Technical Interview, Schedule Screening Call, Request Portfolio Review, Pass>"
}
"""


# ─── ROUTES ───────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": "gemini-2.5-pro", "version": "2.0"}


SUPPORTED_TYPES = {
    ".pdf":  "application/pdf",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
    ".gif":  "image/gif",
}

ROLE_DETECT_PROMPT = """
You are a resume parser. Read this resume and identify the SINGLE most appropriate job role
this candidate is suited for, based on their:
- Degree/education field
- Work experience job titles
- Primary technical skills and projects

Respond with ONLY a raw JSON object - no markdown, no explanation:
{"role": "<job role, e.g. Software Engineer, Data Scientist, Mechanical Engineer, Marketing Manager>"}

Be specific but concise. Use standard industry job titles.
"""

@app.post("/detect-role")
async def detect_role(
    file: UploadFile = File(...)
):
    """Quickly scans a resume to auto-detect the most appropriate job role."""
    filename = (file.filename or "").lower()
    ext = next((e for e in SUPPORTED_TYPES if filename.endswith(e)), None)
    if not ext:
        raise HTTPException(status_code=400, detail="Unsupported file type.")
    mime_type = SUPPORTED_TYPES[ext]

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    tmp_path = None
    gemini_file = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        gemini_file = client.files.upload(
            file=tmp_path,
            config=types.UploadFileConfig(mime_type=mime_type)
        )

        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[gemini_file, ROLE_DETECT_PROMPT],
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=64,
                response_mime_type="application/json",
            )
        )

        raw = response.text.strip()
        # Strip any markdown fences
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        brace_start = raw.find('{')
        brace_end   = raw.rfind('}')
        if brace_start != -1 and brace_end != -1:
            raw = raw[brace_start:brace_end + 1]

        data = json.loads(raw)
        role = data.get("role", "").strip()
        if not role:
            role = "Software Engineer"
        print(f"[FairAI] Auto-detected role: {role}")
        return {"role": role}

    except Exception as e:
        import traceback
        print(f"[FairAI] Role detection error:")
        traceback.print_exc()
        # Graceful fallback - don't crash, just return a generic role
        return {"role": "Professional"}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        if gemini_file:
            try:
                client.files.delete(name=gemini_file.name)
            except Exception:
                pass

@app.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    role: str = Form(default="Software Engineer")
):
    filename = (file.filename or "").lower()
    ext = next((e for e in SUPPORTED_TYPES if filename.endswith(e)), None)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Please upload a PDF or image (JPG, PNG, WEBP, GIF)."
        )
    mime_type = SUPPORTED_TYPES[ext]

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    tmp_path  = None
    gemini_file = None

    try:
        # Write PDF to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        print(f"[FairAI] Uploading {file.filename} ({len(pdf_bytes)} bytes, {mime_type}) to Gemini Files API...")

        # google-genai 1.x file upload API
        gemini_file = client.files.upload(
            file=tmp_path,
            config=types.UploadFileConfig(mime_type=mime_type)
        )
        print(f"[FairAI] File uploaded: {gemini_file.name}")

        prompt = ANALYSIS_PROMPT.replace("{role}", role)
        print(f"[FairAI] Analyzing for role: {role}")

        # Generate content — force JSON output mode
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[gemini_file, prompt],
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=8192,
                response_mime_type="application/json",
            )
        )

        raw = response.text.strip()
        print(f"[FairAI] Got response ({len(raw)} chars)")
        print(f"[FairAI] First 200 chars: {raw[:200]}")

        cleaned = raw
        # Strip markdown fences
        if "```json" in cleaned:
            cleaned = cleaned.split("```json", 1)[1].rsplit("```", 1)[0]
        elif "```" in cleaned:
            cleaned = cleaned.split("```", 1)[1].rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        # Extract the OUTERMOST JSON object (handles any preamble/postamble)
        brace_start = cleaned.find('{')
        brace_end   = cleaned.rfind('}')
        if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
            cleaned = cleaned[brace_start:brace_end + 1]

        result = json.loads(cleaned)

        # Ensure all required fields have safe defaults
        result.setdefault("fit_score", 50)
        result.setdefault("fit_level", "Partial Match")
        result.setdefault("summary", "Analysis complete.")
        result.setdefault("radar", {
            "technical_depth": 50, "problem_solving": 50, "impact_evidence": 50,
            "domain_knowledge": 50, "project_complexity": 50, "communication_clarity": 50
        })
        result.setdefault("strong_signals", [])
        result.setdefault("gaps", [])
        result.setdefault("bias_proxies", [])
        fit = result["fit_score"]
        result.setdefault("counterfactual", {
            "legacy_ats_score": max(0, fit - 20),
            "fairai_score": fit,
            "score_delta": 20,
            "primary_bias_factor": "Unknown"
        })
        result.setdefault("legacy_ats_verdict", "Flagged for Review")
        result.setdefault("recommendation", "Schedule Screening Call")

        print(f"[FairAI] Done! Score={result['fit_score']}, Bias proxies={len(result['bias_proxies'])}")
        return result

    except json.JSONDecodeError as e:
        print(f"[FairAI] JSON parse error: {e}\nRaw: {raw[:300]}")
        raise HTTPException(status_code=500, detail=f"AI returned malformed JSON. Try again. ({e})")
    except Exception as e:
        import traceback
        print(f"[FairAI] Full Error output:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        if gemini_file:
            try:
                client.files.delete(name=gemini_file.name)
                print(f"[FairAI] Cleaned up: {gemini_file.name}")
            except Exception:
                pass
